import { nanoid } from 'nanoid';
import * as Video from './models/video.js';
import fs from 'fs';
import path from 'path';

function print(s, ...args) {
    console.log(`[utils.js] ${s}`, ...args);
}

function getAvaialbleFiles(directory) {
    return fs.readdirSync(directory, {
        withFileTypes: true,
    }).filter(file => {
        let filePath = `${directory}/${file.name}`;

        switch (path.extname(file.name)) {
            case '.mp4':
                return true;
            default:
                return fs.lstatSync(filePath).isDirectory();
        }
    })
}

export function error(res, msg) { res.end(JSON.stringify({ 'error': msg })); }

export function getFiles(directory) {
    return getAvaialbleFiles(directory).map(file => {
        let filePath = `${directory}/${file.name}`;
        let fileName = file.name;

        let stats = fs.statSync(filePath);
        let video = new Video.fromObject({
            ID: nanoid(),
            fileName: fileName,
            fileExt: path.extname(fileName),
            filePath: filePath,
            timeCreated: Math.floor(stats.birthtimeMs),
            timeModified: Math.floor(stats.mtimeMs)
        });

        if (video.directory) return video;

        video.displayName = video.fileName.split('.').slice(0, -1).join('.');
        return video;
    })
}

export async function saveToVideos(session, video) {
    const displayName = sanitize(video.fileName).split('.').slice(0, -1).join('.');

    await session.sql(`
    insert into 
    videos (owner_id, display_name, file_name, file_path) 
    values (1, ?, ?, ?) 
    on duplicate key update file_name = ?`)
        .bind(displayName, video.fielName, video.filePath, video.fileName)
        .execute();
}