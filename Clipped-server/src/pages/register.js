import * as bcrypt from 'bcrypt';
import * as Database from '../database.js';

function RegisterPage(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    let { username, password, token } = req.body;

    if (!username.match(/^[a-zA-Z0-9-_]{3,13}$/g) || !password || password.length < 4) {
        res.write(JSON.stringify({ 'error': 'Invalid credentials' }));
        res.end();
    }

    Database.getConnection().then((session) => {
        session
            .sql('select * from users where username = ?')
            .bind(username)
            .execute()
            .then(rs => {
                let user = rs.fetchOne();
                if (!user) {
                    bcrypt.hash(password, 10, (err, hash) => {
                        session.getDefaultSchema()
                            .getTable('users')
                            .insert(['display_name', 'username', 'password', 'login_token'])
                            .values(username, username, hash, token)
                            .execute()
                            .then(rg => {
                                let accountID = rg.getAutoIncrementValue();
                                res.write(JSON.stringify({
                                    'success': 'Account created',
                                    'account_id': accountID
                                }));

                                console.log('[RegisterController] New account created', username, accountID)
                                session.close();
                                res.end();
                            });
                    });
                } else {
                    res.write(JSON.stringify({ 'error': 'The name is already being used.' }));
                    session.close();
                    res.end();
                }
            })
    });
}

export default RegisterPage;