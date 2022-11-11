import { sanitize, getConnection } from '../database.js';
import { error } from '../utils.js';

import fs from 'fs';
import path from 'path';
import trash from 'trash';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

import * as Video from '../models/video.js';
import * as User from '../models/user.js';

const CACHE = {};

function print(s) {
    console.log(`[video.js] ${s}`);
}

export function VideoUpload(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const user = User.fromObject(JSON.parse(req.body.user));
    const details = JSON.parse(req.body.file_details);

    if (!user.ID) {
        print('/video/upload/: invalid user; upload failed');
        return error(res, 'Invalid session');
    }
    if (!req.file) {
        print('/video/upload/: invalid file; upload failed');
        return error(res, 'No file provided');
    }

    print(`/video/upload/: video upload request by ${user.username} (${user.ID})`);
    getConnection().then(async (session) => {
        const ogExtName = path.extname(details.name);
        const ogFileName = details.name.split('.').slice(0, -1).join('.');
        const fileName = `${user.ID}_${ogFileName}${ogExtName}`;
        const filePath = `${process.env.video_dir}\\${fileName}`;

        let rs = await session
            .sql('insert into videos (owner_id, display_name, file_name, file_path) values (?, ?, ?, ?)')
            .bind(user.ID, details.name, fileName, filePath).execute();
        let ID = rs.getAutoIncrementValue();
        if (ID) {
            fs.writeFileSync(filePath, req.file.buffer);
            res.write(JSON.stringify({ 'success': 'Video uploaded' }));
            print(`/video/upload/: video /v/${ID} uploaded`)
        } else error(res, 'Upload failed due to unknown reason.');

        session.close();
        res.end();
    });

}

export function VideoDetails(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const { ID } = req.params;

    getConnection().then((session) => {
        session.sql('select * from videos where id = ?')
            .bind(ID).execute().then(rs => {
                session.close();

                let row = rs.fetchOne();
                if (!row) return error(res, 'no such video');

                const video = Video.fromArray(row);
                res.write(JSON.stringify(video));
                res.end();

                print(`/video/details/: found video ${ID}`);
            });
    });
}

export function VideoUpdate(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const { action, user, video } = req.body;
    if (!video) return error(res, 'must provide a video object');

    getConnection().then(async (session) => {
        if (action == 'private') {

            if (!user) return error(res, 'must be authenticated');
            else if (user.ID != video.ownerID) return error(res, `can't modify a video owned by another person`);

            let rs = await session.sql(`select * from users where id = ${user.ID} limit 1`).execute();
            let row = rs.fetchOne();
            if (!row) return error(res, 'user not found');

            const remote = User.fromArray(row);
            if (remote.loginToken != user.loginToken) return error(res, 'user not authenticated');
        }

        if (video.delete) {
            if (fs.existsSync(video.filePath)) {
                await session.sql('delete from videos where id = ?').bind(video.ID).execute();
                await trash(video.filePath);
                res.end(JSON.stringify({ 'success': 'Video deleted permanently' }));
                print(`/video/update/: video deleted ${video.ID}`);
            } else {
                error(res, 'video file not found');
            }
        } else {
            await session
                .sql('update videos set display_name = ?, description = ?, private = ?, likes = ?, dislikes = ? where id = ?')
                .bind(video.displayName, video.description, video.private, video.likes, video.dislikes, video.ID).execute();
            res.end(JSON.stringify({ 'success': 'Video updated successfully' }));
            print(`/video/update/: updated video ${video.ID}`);
        }
        session.close();
    });
}

export function VideoStream(req, res) {

    const { ID } = req.params;

    getConnection().then((session) => {
        session.sql('update videos set views = views + 1 where id = ?').bind(ID).execute();
        session.sql('select * from videos where id = ?')
            .bind(ID).execute().then(rs => {
                session.close();

                const video = Video.fromArray(rs.fetchOne());

                fs.readFile(video.filePath, function (err, data) {
                    if (err) throw err;

                    let size = data.length;
                    let range = req.headers.range;
                    let start = 0, end = 0;
                    if (range) {
                        let positions = range.replace(/bytes=/, "").split("-");
                        start = parseInt(positions[0], 10);
                        end = positions[1] ? parseInt(positions[1], 10) : size - 1;

                        if (start >= size) return;
                    }
                    let chunksize = (end - start) + 1;
                    res.writeHead(206, {
                        "Content-Range": "bytes " + start + "-" + end + "/" + size,
                        "Accept-Ranges": "bytes",
                        "Content-Length": chunksize,
                        "Content-Type": "video/mp4"
                    });
                    res.end(data.slice(start, end + 1), "binary");
                });
            });
    });
}

export function VideoSearch(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const { search } = req.body;
    const { a, b, c } = req.params;
    const batchCount = parseInt(process.env.load_size);

    print(`/videos/${a}/: (${b}, ${c}) processing`);
    getConnection().then(async (session) => {

        if (a == 'popular') {
            // cursor starting position
            const start = Math.max(0, parseInt(b));

            session.sql(
                `select * from videos where private = 0 order by views desc limit ${batchCount} offset ${start}`
            ).execute().then((rs) => {
                let row = rs.fetchAll();
                if (row.length == 0) {
                    error(res, 'Reached server limit');
                    return session.close();;
                }

                let videos = [...row].map(Video.fromArray);

                res.end(JSON.stringify(videos));
                session.close();
                print(`/videos/popular/: sent ${videos.length} videos, limit ${batchCount} offset ${start}`);
            });
        } else if (a == 'browse') {
            // cursor starting position
            const start = Math.max(0, parseInt(c));

            session.sql(
                'select target_location from navbar where slug like ?'
            ).bind(b).execute().then((rs) => {
                let row = rs.fetchOne();
                if (!row) {
                    error(res, 'Bad location');
                    return session.close();
                }

                session.sql(
                    `select * from videos 
                    where private = 0 and file_path like '%${row[0].replace(/\\/g, '%')}%' 
                    and display_name like '%${search ? sanitize(search) : ''}%' 
                    order by created_at limit ${batchCount} offset ${start}`
                ).execute().then((rs) => {
                    let rows = rs.fetchAll();
                    let videos = [...rows].map(Video.fromArray);
                    if (rows.length == 0) {
                        if (search) error(res, 'No videos found');
                        else error(res, 'Reached server limit');
                        return session.close();
                    }

                    print(`/videos/browse/${b}/: sent ${rows.length} videos, limit ${batchCount} offset ${start}`);
                    res.end(JSON.stringify(videos));
                    session.close();
                });
            });
        } else if (a == 'user') {
            // cursor starting position
            const start = Math.max(0, parseInt(c));

            // list videos from newest to oldest (default)
            session.sql(
                `select * from videos where private = 0 and owner_id = ${b} order by created_at desc limit ${batchCount} offset ${start}`
            ).execute().then((rs) => {
                let rows = rs.fetchAll();
                let videos = [...rows].map(Video.fromArray);
                if (rows.length == 0) {
                    if (search) error(res, 'No videos found');
                    else error(res, 'Reached server limit');
                    return session.close();
                }

                print(`/videos/user/${b}/: sent ${rows.length} videos, limit ${batchCount} offset ${start}`);
                res.end(JSON.stringify(videos));
                session.close();
            });
        } else if (a == 'private') {

            session.sql(
                `select * from videos where owner_id = ${b} and private = 1 order by created_at`
            ).execute().then((rs) => {
                let rows = rs.fetchAll();
                let videos = [...rows].map(Video.fromArray);
                if (rows.length == 0) {
                    if (search) error(res, 'No videos found');
                    else error(res, 'No videos available');
                    return session.close();
                }

                print(`/videos/private/${b}/: sent ${rows.length} videos`);
                res.end(JSON.stringify(videos));
                session.close();
            });
        } else {
            print(`/videos/browse/: unhandled action: ${a}`);
            res.end();
        }
    });
}

export function VideoPreview(req, res) {
    // serve existing file
    // change max-age on production
    res.writeHead(200, {
        'Content-Type': 'video/webm',
        'Cache-Control': 'public, max-age=30, no-cache'
    });

    const url = req.url[0] == '/' ? req.url.substring(1) : req.url;
    const sp = url.split('/').splice(1);
    const ID = sp[1];

    const filePath = `bin/preview/${ID}.webm`;
    const getVideo = (callback) => {
        fs.readFile(filePath, (error, content) => {
            callback(content);
        });
    };

    if (CACHE[filePath]) {
        if (fs.existsSync(filePath)) {
            // print(`Fast-served existing preview for video ${ID}`);
            getVideo((c) => {
                res.write(c);
                res.end();
            });
        }
    } else {
        // print(`/video/preview/: loading video: ${ID}`);
        getConnection().then((session) => {
            session.sql('select * from videos where id = ? limit 1').bind(ID).execute().then((rs) => {
                const row = rs.fetchOne();
                if (!row) return error(res, `Video ${ID} not found`);

                const video = Video.fromArray(row);

                if (!fs.existsSync(filePath)) {
                    print(`/video/preview/: Extracting from video ${video.ID}: ${video.filePath}`);

                    // create video thumbnail if it doens't exist
                    ffmpeg(video.filePath)
                        .setFfmpegPath(ffmpegPath)
                        .format('webm')
                        .native()
                        .seekInput(3)
                        .noAudio()
                        .duration(3)
                        .size('200x?')
                        .output(filePath)
                        .on('end', () => {
                            getVideo(c => res.end(c));
                            session.close();
                            print(`/video/preview/: Generated for video ${video.ID}\r\n`);

                            CACHE[filePath] = true; // success
                        })
                        .on('error', (e) => {
                            res.end();
                            session.close();
                            console.error(`[video.js] Failed to generate preview for video ${video.ID}: ${e.message}`);

                            CACHE[filePath] = false; // reset cache to allow retrying
                        })
                        .run();
                    return;
                } else {
                    getVideo((c) => {
                        res.end(c)
                        CACHE[filePath] = true; // success
                        // print(`/video/preview/: Cached for video ${video.ID}`);
                    });
                }

                res.end();
                session.close();
            });
        });
    }
}