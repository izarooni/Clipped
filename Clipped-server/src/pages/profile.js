import { getConnection, sanitize } from '../database.js';
import { error } from '../utils.js';
import fs from 'fs';
import * as bcrypt from 'bcrypt';
import * as identicon from 'identicon';
import * as User from '../models/user.js';

const print = (s) => {
    console.log(`[profile.js] ${s}`);
};

export function ProfileUpdate(req, res) {
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
                                .bind(hash, user.ID).execute().then(rs2 => {
                                    print(`/profile/update/${type}/: user ${user.ID} password updated`);
                                    res.end(JSON.stringify({ 'success': 'Password saved' }));
                                    session.close();
                                });
                        });
                    }
                }

                session
                    .sql('update users set display_name = ?, updated_at = current_timestamp where id = ?')
                    .bind(localUser.displayName, user.ID).execute().then((rs) => {
                        print(`/profile/update/${type}/: user ${user.ID} display name updated to ${localUser.displayName}`);
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
                        print(`/profile/update/${type}/: user ${user.ID} avatar updated`);
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

export function ProfilePage(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { ID } = req.params;
    if (!ID) return error(res, 'Must specify an ID');

    getConnection().then((session) => {
        let s = isNaN(parseInt(ID))
            ? 'select * from users where username like ? limit 1'
            : 'select * from users where id = ? limit 1';

        session
            .sql(s).bind(ID)
            .execute().then((rs) => {
                session.close();

                let row = rs.fetchOne();
                if (row) {
                    const user = User.fromArray(row);

                    // unnescssary or sensitive information
                    delete user.webAdmin;
                    delete user.password;
                    delete user.avatar;
                    delete user.loginToken;

                    res.end(JSON.stringify(user));
                    return;
                }

                print(`/profile/: looking up user ${ID}... ${row ? 'found!' : 'not found'}`);
                error(res, `failed to find any user named  ${ID}.`);
            });
    }).catch(e => print(`/profile/: ${e}`));
}

export function ProfileAvatarPage(req, res) {
    res.set('Content-Type', 'image/jpeg');

    const sendDefaultAvatar = (res) => res.end(fs.readFileSync("bin/avatar/_.jpg"));

    const { ID } = req.params;
    if (!ID) return sendDefaultAvatar(res);

    getConnection().then((session) => {
        session
            .sql('select * from users where id = ? limit 1')
            .bind(ID)
            .execute()
            .then((rs) => {
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
                    res.end(fs.readFileSync(filePath));
                }
            });
    }).catch(e => print(`/profile/avatar/: ${e}`));;
}

export function ProfileAddFriend(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { ID } = req.params;
    const { user } = req.body;
    if (!ID) return error(res, 'Must specify an ID');
    if (!user) return error(res, 'must be authenticated');

    getConnection().then((session) => {
        session.sql(`select * from users where id = ? limit 1`).bind(user.ID).execute().then(async (rs) => {
            let row = rs.fetchOne();
            if (!row) {
                session.close();
                return error(res, 'Invalid session');
            }

            let row2 = await session.sql('select * from users where id = ? limit 1').bind(ID).execute();
            if (!(row2 = row2.fetchOne())) {
                session.close();
                return error(res, 'Friend not found');
            }

            const remote = User.fromArray(row);
            const target = User.fromArray(row2);
            if (remote.loginToken != user.loginToken) return error(res, 'user not authenticated');

            let row3 = await session.sql('select f.user_b, u.display_name from friends f join users u on f.user_b = u.id where f.user_a = ?').bind(remote.ID).execute();
            if (!(row3 = row3.fetchAll())) return error(res, 'No friends');

            const friends = [...row3].map(r => { return { ID: r[0], displayName: r[1] } });
            for (let i = 0; i < friends.length; i++) {
                let friend = friends[i];

                if (friend.ID == ID) {
                    session.sql('delete from friends where user_a = ? and user_b = ?').bind(remote.ID, ID).execute().then(r => session.close());
                    friends.splice(i, 1);
                    res.end(JSON.stringify(friends));
                    print(`/profile/friend/${ID}: ${remote.username} unfriended ${target.username}`)
                    return;
                }
            }
            session.sql('insert into friends (user_a, user_b) values (?, ?)').bind(remote.ID, ID).execute().then(r => session.close());
            friends.push({ ID: target.ID, displayName: target.displayName });
            res.end(JSON.stringify(friends));
            print(`/profile/friend/${ID}: ${remote.username} friended ${target.username}`)
        });
    }).catch(e => print(`/profile/friend/${ID}: ${e}`));
}