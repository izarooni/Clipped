import { getSession } from '@mysql/xdevapi';
import { getFiles, saveToVideos } from './utils.js';
import * as bcrypt from 'bcrypt';
import fs from 'fs';

function print(s, ...args) {
    console.log(`[database.js] ${s}`, ...args);
}

export async function initialize(session) {
    print('connection established')

    let result = await session.getDefaultSchema().existsInDatabase();
    if (!result) {
        print('target schema does not exist. Creating...');
        session.createSchema(schemaName);
    }

    //=============================================================================
    //                            create users table
    //=============================================================================
    let rs = await session.sql(
        `create table if not exists users (
            id int not null auto_increment,
            web_admin tinyint(1) not null default 0,
            display_name varchar(13) not null,
            username varchar(255) not null,
            \`password\` varchar(255) not null,
            login_token text default null,
            created_at timestamp not null default current_timestamp,
            updated_at timestamp default null,
            avatar longtext default null,
            primary key (id), 
            unique (username)
        )`).execute();
    let warnings = rs.getWarnings();
    if (warnings.length == 0) print('Checking users table...exists');
    else if (warnings) print('Checking users table...', warnings[0].msg);

    rs = await session.sql('select * from users where id = 1 limit 1').execute();
    let user = rs.fetchOne();
    if (!user) {

        const defaultUsername = process.env.default_username;
        const defaultPassword = process.env.default_password;

        bcrypt.hash(defaultPassword, 10, (err, hash) => {
            session
                .sql(`
            insert into users (id, web_admin, display_name, username, password) 
            values (default, ?, ?, ?, ?)`)
                .bind(1, defaultUsername, defaultUsername, hash).execute().then((res) => {
                    let id = res.getAutoIncrementValue();
                    if (id) {
                        print(`=============================================================================`);
                        print(`[Database] Created web-admin account. username: ${defaultUsername}, password: ${defaultPassword}`);
                        print(`=============================================================================`);
                    }
                });
        });
    }

    //=============================================================================
    //                            create friends table
    //=============================================================================
    rs = await session.sql(
        `create table if not exists friends (
            id int not null auto_increment,
            user_a int not null,
            user_b int not null,

            primary key (id),
            index (user_a),
            index (user_b),
            index (user_a, user_b),
            foreign key (user_a) references users (id) on delete cascade on update cascade,
            foreign key (user_b) references users (id) on delete cascade on update cascade
        )`).execute()
    warnings = rs.getWarnings();
    if (warnings.length == 0) print('Checking friends table...created');
    else if (warnings) print('Checking friends table...', warnings[0].msg);

    //=============================================================================
    //                            create videos table
    //=============================================================================
    rs = await session.sql(
        `create table if not exists videos (
            id int not null auto_increment,
            owner_id int not null,
            display_name varchar(200) default '',
            file_name varchar(260) default null,
            file_path varchar(260) default null,
            created_at timestamp not null default current_timestamp,
            updated_at timestamp default null,
            views int not null default 0,
            likes int not null default 0,
            dislikes int not null default 0,
            private int not null default 1,
            description text default null,

            primary key (id),
            unique (file_path),
            index (private),
            foreign key (owner_id) references users (id) on delete no action on update cascade
        )`).execute()
    warnings = rs.getWarnings();
    if (warnings.length == 0) {
        print('Checking videos table...created');
        // path to root-directory of videos
        let files = getFiles('bin/videos/');
        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            let stats = fs.lstatSync(file.filePath);
            if (stats.isDirectory()) {
                // get files only from the sub-directory
                getFiles(file.filePath)
                    .filter(f => f.fileName.split('.').length > 0)
                    .forEach((video) => {
                        saveToVideos(session, video);
                    });
            } else {
                saveToVideos(session, file);
            }
        }
    } else if (warnings) print('Checking videos table...', warnings[0].msg);

    //=============================================================================
    //                         create comments table
    //=============================================================================
    rs = await session.sql(
        `create table if not exists comments (
            id int not null auto_increment,
            video_id int not null,
            parent_comment_id int not null,
            owner_id int not null,
            message text not null,
            created_at timestamp not null default current_timestamp,
            updated_at timestamp default null,
            likes int not null default 0,
            dislikes int not null default 0,          
            
            primary key (id),
            index (video_id),
            foreign key (video_id) references videos (id) on delete cascade on update cascade,
            foreign key (owner_id) references users (id) on delete cascade on update cascade
        )`).execute();
    warnings = rs.getWarnings();
    if (warnings.length == 0) print('Checking comments table...created');
    else if (warnings) print('Checking comments table...', warnings[0].msg);

    //=============================================================================
    //                         create navbar table
    //=============================================================================
    rs = await session.sql(
        `create table if not exists navbar (
            id int not null auto_increment,
            slug varchar(45) not null,
            display_name varchar(45) not null,
            primary key (id),
            unique (slug)
        )`).execute();
    warnings = rs.getWarnings();
    if (warnings.length == 0) print('Checking navbar table...created');
    else if (warnings) print('Checking navbar table...', warnings[0].msg);

    //=============================================================================
    //                         create navbar table
    //=============================================================================
    rs = await session.sql(
        `create table if not exists video_popularity (
            id int not null,
            video_id int not null,
            user_id int not null,
            \`value\` int not null,
            primary key (id),
            index video_pop_user_id (user_id),
            index video_pop_video_id (video_id),
            index video_pop_update (video_id, user_id),
            index video_pop_stats (\`value\`, video_id),
            foreign key (user_id) references users (id) on delete cascade on update restrict,
            foreign key (video_id) references videos (id) on delete cascade on update cascade
        )`).execute();
    warnings = rs.getWarnings();
    if (warnings.length == 0) print('Checking popularity table...created');
    else if (warnings) print('Checking popularity table...', warnings[0].msg);
}

export function getConnection() {
    return getSession({
        host: process.env.db_host,
        port: parseInt(process.env.db_port),
        user: process.env.db_user,
        password: process.env.db_pass,
        schema: process.env.db_schema,
    });
}