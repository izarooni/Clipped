import { getConnection, sanitize } from '../database.js';
import { error } from '../utils.js';
import fs from 'fs';
import * as identicon from 'identicon';
import * as User from '../models/user.js';

const print = (s) => {
    console.log(`[profile.js] ${s}`);
};

function ProfileUpdate(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { type, value } = req.body;
    if (!type || type.length < 1 || !value || value.length < 1) return error(res, 'invalid request type');

    const user = User.fromObject(value);
    if (!user.ID) return error(res, 'please specify identification.');
    print(`/profile/update/${type}/: update for user ${user.username} (${user.ID})`);

    const quit = (session, res) => {
        console.log();
        session.close();
        res.end();
    };

    getConnection().then((session) => {
        const users = session.getDefaultSchema().getTable('users');

        switch (type) {
            case 'name':
                if (user.displayName.length < 3) {
                    session.close();
                    return error(res, 'Name is too short.');
                }
                users.update().set('display_name', user.displayName)
                    .where('id = ' + user.ID).execute().then((rs) => {
                        print(`profile/update/${type}/: display name updated for ${user.ID}`);
                        res.write(JSON.stringify({ 'success': 'Display name updated' }));
                        quit(session, res);
                    });
                break;
            case 'avatar': {
                let filePath = `bin/avatar/${user.ID}.jpeg`;
                let base64 = user.avatar.split('base64,')[1];
                let buffer = Buffer.from(base64, 'base64');
                fs.writeFileSync(filePath, buffer);

                users.update().set('avatar', user.avatar)
                    .where('id = ' + user.ID).execute().then((rs) => {
                        print(`profile/update/${type}/: avatar updated for ${user.ID}`);
                        res.write(JSON.stringify({ 'message': 'Avatar updated ' }))
                        quit(session, res);
                    });
                break;
            }
            default:
                session.close();
                return error(res, 'unhandled action');
        }
    });
}

function ProfilePage(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const url = req.url[0] == '/' ? req.url.substring(1) : req.url;
    const sp = url.split('/').splice(1);
    const userID = sp[0];

    if (!userID) return error(res, 'please specify an identification.');

    getConnection().then((session) => {
        let s = isNaN(parseInt(userID))
            ? `select * from users where username like '${sanitize(userID)}' limit 1`
            : `select * from users where id = ${sanitize(userID).replace(/[^0-9]/g, '')} limit 1`;

        session.sql(s).execute().then((rs) => {
            let row = rs.fetchOne();
            if (row) {
                const user = User.fromArray(row);

                // unnescssary or sensitive information
                delete user.webAdmin;
                delete user.password;
                delete user.avatar;
                delete user.loginToken;

                res.end(JSON.stringify(user));
            } else error(res, `failed to find any user named  ${userID}.`);

            session.close();
            print(`profile/: looking up user ${userID}... ${row ? 'found!' : 'not found'}`);
        })
    });
}

function ProfileAvatarPage(req, res) {
    const url = req.url[0] == '/' ? req.url.substring(1) : req.url;
    const sp = url.split('/').splice(1);
    const userID = parseInt(sp[1]);
    if (!userID || isNaN(userID)) return error(res, 'must specify user');

    // print(`profile/avatar/: requested user avatar`, userID);

    getConnection().then((session) => {
        session
            .sql('select * from users where id = ?')
            .bind(userID)
            .execute()
            .then(rs => {
                let user = User.fromArray(rs.fetchOne());
                let filePath = "bin/avatar/_.jpg";
                if (!user) {
                    res.set('Content-Type', 'image/jpeg');
                    res.write(fs.readFileSync(filePath));
                    res.end();
                    console.log();
                    return;
                }

                filePath = `bin/avatar/${user.ID}.jpeg`;
                // save the avatar so there's less processing overhead
                if (!fs.existsSync(filePath)) {
                    if (user.avatar) {
                        let base64 = user.avatar.split('base64,')[1];
                        let buffer = Buffer.from(base64, 'base64');
                        fs.writeFileSync(filePath, buffer);
                    } else {
                        identicon.generate({ id: `${user.ID}`, size: 128 }, (err, buffer) => {
                            if (err) return;
                            res.end(buffer);
                            fs.writeFileSync(filePath, buffer);
                        });
                    }
                    console.log(`[profile.js] profile/avatar/: cached user ${user.ID} avatar into jpeg`);
                } else {
                    res.set('Content-Type', 'image/jpeg');
                    res.write(fs.readFileSync(filePath));
                    res.end();
                    console.log();
                }
            });
    });
}

export { ProfileUpdate, ProfilePage, ProfileAvatarPage }