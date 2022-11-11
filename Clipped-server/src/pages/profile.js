import { getConnection, sanitize } from '../database.js';
import { error } from '../utils.js';
import fs from 'fs';
import * as bcrypt from 'bcrypt';
import * as identicon from 'identicon';
import * as User from '../models/user.js';

const print = (s) => {
    console.log(`[profile.js] ${s}`);
};

function ProfileUpdate(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { type, localUser: rawUser, newPassword } = req.body;
    if (!type || type.length < 1 || !rawUser) return error(res, 'invalid request type');

    const localUser = User.fromObject(rawUser);
    if (!rawUser || !localUser.ID) return error(res, 'please specify an ID');
    print(`/profile/update/${type}/: update for localUser ${localUser.username} (${localUser.ID})`);

    getConnection().then(async (session) => {
        let rs = await session.sql('select * from users where id = ? limit 1').bind(localUser.ID).execute();
        let row = rs.fetchOne();
        if (!row) return err(res, 'Invalid session');
        const user = User.fromArray(row);
        if (!user) return err(res, 'Unknown error');

        switch (type) {
            case 'settings':
                if (localUser.displayName.length < 3) {
                    if (!localUser.displayName.length) {
                        // replace with original name when none is provided
                        user.displayName = user.username;
                    } else {
                        session.close();
                        return error(res, 'Name is too short');
                    }
                }
                if (newPassword) {
                    if (newPassword.length < 4) {
                        session.close();
                        return error(res, 'New password is too short');
                    } else {
                        bcrypt.hash(newPassword, 10, (err, hash) => {
                            session
                                .sql('update users set password = ?, updated_at = current_timestamp where id = ?')
                                .bind(hash, user.ID).execute().then(rs => {
                                    print(`profile/update/${type}/: user ${user.ID} password updated`);
                                    res.end(JSON.stringify({ 'success': 'Password saved' }));
                                    session.close();
                                });
                        });
                    }
                }

                session
                    .sql('update users set display_name = ?, updated_at = current_timestamp where id = ?')
                    .bind(localUser.displayName, user.ID).execute().then(rs => {
                        print(`profile/update/${type}/: user ${user.ID} display name updated to ${localUser.displayName}`);
                        res.end(JSON.stringify({ 'success': 'Display name saved' }));
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
    if (!ID) return error(res, 'Must specify an ID');

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