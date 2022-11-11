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

    const { type, localUser } = req.body;
    if (!type || type.length < 1 || !localUser || localUser.length < 1) return error(res, 'invalid request type');

    const user = User.fromObject(localUser);
    if (!user.ID) return error(res, 'please specify an ID');
    print(`/profile/update/${type}/: update for user ${user.username} (${user.ID})`);

    getConnection().then((session) => {
        const users = session.getDefaultSchema().getTable('users');

        switch (type) {
            case 'name':
                if (user.displayName.length < 3) {
                    if (!user.displayName.length) {
                        // replace with original name when none is provided
                        user.displayName = user.username;
                    } else {
                        session.close();
                        return error(res, 'Name is too short.');
                    }
                }
                users.update().set('display_name', user.displayName)
                    .where('id = ' + user.ID).execute().then((rs) => {
                        print(`profile/update/${type}/: user ${user.ID} updated`);
                        res.end(JSON.stringify({ 'success': 'Setting saved' }));
                        session.close();
                    });
                break;
            case 'avatar': {
                let filePath = `bin/avatar/${user.ID}.jpeg`;
                let base64 = user.avatar.split('base64,')[1];
                let buffer = Buffer.from(base64, 'base64');
                fs.writeFileSync(filePath, buffer);

                users.update().set('avatar', user.avatar)
                    .where('id = ' + user.ID).execute().then((rs) => {
                        print(`profile/update/${type}/: user ${user.ID} avatar updated`);
                        res.end(JSON.stringify({ 'message': 'Avatar updated ' }))
                        session.close();
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

    const { ID } = req.params;
    if (!ID) return error(res, 'Must specify an ID.');

    getConnection().then((session) => {
        let s = isNaN(parseInt(ID))
            ? `select * from users where username like ? limit 1`
            : `select * from users where id = ? limit 1`;

        session
            .sql(s).bind(ID)
            .execute().then((rs) => {
                let row = rs.fetchOne();
                if (row) {
                    const user = User.fromArray(row);

                    // unnescssary or sensitive information
                    delete user.webAdmin;
                    delete user.password;
                    delete user.avatar;
                    delete user.loginToken;

                    res.end(JSON.stringify(user));
                } else error(res, `failed to find any user named  ${ID}.`);

                session.close();
                print(`profile/: looking up user ${ID}... ${row ? 'found!' : 'not found'}`);
            })
    });
}

function ProfileAvatarPage(req, res) {
    res.set('Content-Type', 'image/jpeg');

    const sendDefaultAvatar = (res) => res.end(fs.readFileSync("bin/avatar/_.jpg"));

    const { ID } = req.params;
    if (!ID) return sendDefaultAvatar(res);

    getConnection().then((session) => {
        session
            .sql('select * from users where id = ?')
            .bind(ID)
            .execute()
            .then(rs => {
                session.close();
                let row = rs.fetchOne();
                let user = null;

                if (!row || !(user = User.fromArray(row))) {
                    return sendDefaultAvatar(res);
                }

                const filePath = `bin/avatar/${user.ID}.jpeg`;
                if (!fs.existsSync(filePath)) {
                    // save the avatar so there's less processing overhead
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
                    print(`/profile/avatar/: cached user ${user.ID} avatar into jpeg`);
                } else {
                    res.write(fs.readFileSync(filePath));
                    res.end();
                }
            });
    });
}

export { ProfileUpdate, ProfilePage, ProfileAvatarPage }