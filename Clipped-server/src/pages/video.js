import { sanitize, getConnection } from '../database.js';
import { error } from '../utils.js';

import fs from 'fs';
import path from 'path';
import trash from 'trash';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

import * as Video from '../models/video.js';
import * as User from '../models/user.js';
import * as Comment from '../models/comment.js';

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
        const filePath = `bin/videos/${fileName}`;

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

    const { ID } = req.params;
    const { user } = req.body;
    if (!ID || isNaN(parseInt(ID))) {
        return error(res, 'Must specify an ID');
    }

    getConnection().then(async (session) => {
        let rs = await session.sql('select * from videos where id = ?').bind(ID).execute();
        let row = rs.fetchOne();
        if (!row) return error(res, 'no such video');
        const video = Video.fromArray(row);

        rs = await session.sql(`
                select
                    (select count(*) from video_popularity where value = 1 and video_id = ?) as likes,
                    (select count(*) from video_popularity where value = 0 and video_id = ?) as dislikes`)
            .bind(video.ID, video.ID)
            .execute();

        rs = rs.fetchOne();
        video.likes = rs[0];
        video.dislikes = rs[1];

        if (user) {
            // validate session
            rs = await session.sql(`select * from users where id = ? limit 1`).bind(user.ID).execute();
            row = rs.fetchOne();
            if (!row) return error(res, 'user not found');
            const remote = User.fromArray(row);
            if (remote.loginToken != user.loginToken) return error(res, 'user not authenticated');

            // check if user liked or disliksed the video
            rs = await session
                .sql(`select \`value\` from video_popularity where video_id = ? and user_id = ?`)
                .bind(video.ID, remote.ID)
                .execute();

            if (rs = rs.fetchOne()) {
                video.user_review = rs[0];
            }
        }

        session.close();
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(JSON.stringify(video));
        print(`/video/details/: found video ${ID}`);
    });
}

export function VideoComment(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const { ID } = req.params;
    const { action, user, comment } = req.body;
    if (!user || !user.ID) return error(res, 'invalid user session');
    else if (!comment) return error(res, 'You must enter a message');
    print(`/video/comment/: ${user.username} adding comment to video ${ID}`);

    getConnection().then(async (session) => {
        // create the comment if the user session is valid
        let rs = await session.sql(`select * from users where id = ${user.ID} limit 1`).execute();
        let row = rs.fetchOne();
        if (!row) return error(res, 'user not found');

        const remote = User.fromArray(row);
        if (remote.loginToken != user.loginToken) return error(res, 'user not authenticated');

        if (action == 'create') {
            session
                .sql(`insert into comments (video_id, parent_comment_id, owner_id, message, created_at) values (?, ?, ?, ?, current_timestamp)`)
                .bind(ID, 0, user.ID, comment).execute().then((rs) => {
                    res.end(JSON.stringify({ 'success': 'Comment created' }));
                    session.close();
                });
        } else if (action == 'delete') {
            if (comment.parentCommentID == 0) {
                session
                    .sql('delete from comments where id = ? or parent_comment_id = ?')
                    .bind(comment.ID, comment.ID).execute()
                    .then((rs) => {
                        res.end(JSON.stringify({ 'success': 'Comment deleted' }));
                        session.close();
                    });
            } else {
                error(res, 'cannot delete a sub-comment');
            }
        }
    });
}

export function VideoComments(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const { ID, thread } = req.params;
    if (!ID || isNaN(parseInt(ID))) {
        return error(res, 'Video is no longer available.');
    }

    print(`/video/comment/: loading comments for video ${ID}`);

    getConnection().then(async (session) => {
        let rs = await session
            .sql(`select c.*, u.display_name from comments c join users u on c.owner_id = u.id where c.video_id = ? and parent_comment_id = ? order by created_at desc`)
            .bind(ID, thread ? thread : 0).execute();
        let rows = rs.fetchAll();
        if (rows.length == 0) {
            // no comments, write blank json response
            // to indiciate no error thus no messages
            session.close();
            return res.end('{}');
        }

        res.end(JSON.stringify(
            // convert sql result set into a json object then send it 
            [...rows].map((row) => {
                let c = Comment.fromArray(row);
                c.ownerDisplayName = row[row.length - 1];
                return c;
            })
        ));
        session.close();
    });
}

export function VideoUpdate(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/json' });

    const { action, user, video } = req.body;
    if (!video) return error(res, 'must provide a video object');

    getConnection().then(async (session) => {

        const auth = async () => {
            if (!user) {
                error(res, 'must be authenticated');
                return false;
            } else if (user.ID != video.ownerID) {
                error(res, `can't modify a video owned by another person`);
                return false;
            }

            let rs = await session.sql(`select * from users where id = ? limit 1`).bind(user.ID).execute();
            let row = rs.fetchOne();
            if (!row) {
                error(res, 'user not found');
                return false;
            }

            const remote = User.fromArray(row);
            if (remote.loginToken != user.loginToken) {
                error(res, 'user not authenticated');
                return false;
            }

            return true;
        };

        switch (action) {
            case 'private':
            case 'public': {
                if (!auth()) return;
                video.private = (action == 'private') ? 1 : 0;

                await session
                    .sql('update videos set private = ?, updated_at = current_timestamp where id = ?')
                    .bind(video.private, video.ID)
                    .execute();
                res.end(JSON.stringify({ 'success': `Video is now ${video.private ? 'private' : 'public'}` }));
                print(`/video/update/${action}/: video privacy set to ${video.private ? 'private' : 'public'}`);
                session.close();
                break;
            }
            case 'like':
            case 'dislike': {
                if (!auth()) return;
                let value = (action == 'like' ? 1 : 0);

                let rs = await session
                    .sql(`select \`value\` from video_popularity where video_id = ? and user_id = ?`)
                    .bind(video.ID, user.ID)
                    .execute();
                if (rs = rs.fetchOne()) {
                    // liking or disliking when already liked or disliked (undo it)
                    if (value == rs[0]) {
                        print(`/video/update/${action}/: video popularity unset for user ${user.username}`);
                        await session
                            .sql('delete from video_popularity where video_id = ? and user_id = ?')
                            .bind(video.ID, user.ID)
                            .execute();
                    } else {
                        print(`/video/update/${action}/: video popularity set for user ${user.usename}: ${value ? 'liked' : 'disliked'}`);
                        await session
                            .sql('update video_popularity set `value` = ? where video_id = ? and user_id = ?')
                            .bind(value, video.ID, user.ID)
                            .execute();
                    }
                } else {
                    print(`/video/update/${action}/: video popularty created for user ${user.username}: ${value ? 'liked' : 'disliked'}`);
                    await session
                        .sql('insert into video_popularity (video_id, user_id, `value`) values (?, ?, ?)')
                        .bind(video.ID, user.ID, value)
                        .execute();
                }
                // no message response necessary
                res.end(JSON.stringify({}));
                session.close();
                return;
            }
            case 'delete': {
                await session.sql('delete from videos where id = ?').bind(video.ID).execute();
                if (fs.existsSync(video.filePath)) {
                    await trash(video.filePath);
                    print(`/video/update/${action}: video file deleted ${video.ID}`);
                }

                res.end(JSON.stringify({ 'success': 'Video deleted permanently' }));
                print(`/video/update/${action}: video deleted ${video.ID}`);
                session.close();
                break;
            }
            case 'update': {
                await session
                    .sql('update videos set display_name = ?, description = ?, updated_at = current_timestamp where id = ?')
                    .bind(video.displayName, video.description, video.ID)
                    .execute();
                res.end(JSON.stringify({ 'success': 'Video updated successfully' }));
                print(`/video/update/${action}/: updated video details ${video.ID}`);
                session.close();
                break;
            }
            default:
                print(`/video/update/${action}/: unhandled action: ${action}`);
                break;
        }
    });
}

export function VideoStream(req, res) {

    const { ID } = req.params;
    if (!ID || isNaN(parseInt(ID))) {
        return error(res, 'Video is no longer available.');
    }

    getConnection().then(async (session) => {
        session.sql('update videos set views = views + 1, updated_at = current_timestamp where id = ?').bind(ID).execute();
        session.sql('select * from videos where id = ?')
            .bind(ID).execute().then((rs) => {
                session.close();

                const video = Video.fromArray(rs.fetchOne());

                if (!fs.existsSync(video.filePath)) {
                    return res.writeHead(404, 'Video is no longer available.');
                }

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

    getConnection().then(async (session) => {

        if (a == 'popular') {
            // cursor starting position
            const start = Math.max(0, parseInt(b));

            session.sql(
                `select v.*, u.display_name 
                from videos v 
                join users u on v.owner_id = u.ID 
                where v.private = 0 
                order by v.views desc 
                limit ? offset ?`
            ).bind(batchCount, start).execute().then((rs) => {
                let row = rs.fetchAll();
                if (row.length == 0) {
                    if (start < 1) error(res, 'No videos available');
                    else error(res, 'Reached end of list');

                    return session.close();;
                }

                let videos = [...row].map((v) => {
                    let ret = new Video.fromArray(v);
                    ret.ownerDisplayName = v[v.length - 1];
                    return ret;
                });

                res.end(JSON.stringify(videos));
                session.close();
                print(`/videos/${a}/: (${b}, ${c}) processing... sent ${videos.length} videos, limit ${batchCount} offset ${start}`);
            });
        } else if (a == 'user') {
            // cursor starting position
            const start = Math.max(0, parseInt(c));

            // list videos from newest to oldest (default)
            session.sql(`
                select * from videos 
                where private = 0 and owner_id = ?
                order by created_at desc 
                limit ? offset ?`
            ).bind(b, batchCount, start).execute().then((rs) => {
                let rows = rs.fetchAll();
                let videos = [...rows].map(Video.fromArray);
                if (rows.length == 0) {
                    if (search || start == 0) error(res, 'No videos found');
                    else error(res, 'Reached end of list');
                    return session.close();
                }

                print(`/videos/${a}/: (${b}, ${c}) processing... sent ${rows.length} videos: limit ${batchCount} offset ${start}`);
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

                print(`/videos/${a}/: (${b}, ${c}) processing... sent ${rows.length} videos`);
                res.end(JSON.stringify(videos));
                session.close();
            });
        } else {
            print(`/videos/${a}/: (${b}, ${c}) processing... unhandled action: ${a}`);
            res.end();
        }
    });
}

export function VideoPreview(req, res) {
    const { ID } = req.params;
    const { type } = req.query;

    const filePathNoExt = `bin/preview/${ID}`;
    if (type == 'image') {
        let imageFile = `${filePathNoExt}.jpg`;
        if (fs.existsSync(imageFile)) {
            res.writeHead(200, {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=30, no-cache'
            });
            return res.end(fs.readFileSync(imageFile));
        }
        return res.writeHead(404, 'Image not found');
    }

    // serve existing file
    // todo change max-age on production
    res.writeHead(200, {
        'Content-Type': 'video/webm',
        'Cache-Control': 'public, max-age=30, no-cache'
    });

    const filePath = `${filePathNoExt}.webm`;
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
                    print(`/video/preview/: Extracting from video ${video.ID}`);

                    // create video thumbnail if it doens't exist
                    ffmpeg(video.filePath)
                        .setFfmpegPath(ffmpegPath)
                        .on('end', () => {
                            getVideo(c => res.end(c));
                            session.close();
                            print(`/video/preview/: .webm preview generated for video ${video.ID}`);

                            CACHE[filePath] = true; // success
                        })
                        .on('error', (e) => {
                            res.end();
                            session.close();
                            print(`/video/preview/: failed to generate preview for video ${video.ID}: ${e.message}`);

                            CACHE[filePath] = false; // reset cache to allow retrying
                        })
                        .on('filenames', function (filenames) {
                            print('/video/preview/: will generate ' + filenames.join(', '));
                        })
                        .format('webm')
                        .native()
                        .seekInput(3)
                        .noAudio()
                        .duration(3)
                        .size('200x?')
                        .output(filePath)
                        .screenshots({
                            count: 1,
                            folder: `bin/preview`,
                            filename: `${video.ID}.jpg`,
                            size: '1280x720',
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