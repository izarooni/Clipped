import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { sanitize } from './database.js';
import * as Video from './models/video.js';

function print(s, ...args) {
    console.log(`[utils.js] ${s}`, ...args);
}

function getAvaialbleFiles(directory) {
    return fs.readdirSync(directory, {
        withFileTypes: true,
    }).filter(file => {
        let filePath = `${directory}\\${file.name}`;

        switch (path.extname(file.name)) {
            case '.mp4':
                return true;
            default:
                return fs.lstatSync(filePath).isDirectory();
        }
    })
}

export function error(res, msg) { res.end(JSON.stringify({ 'error': msg })); }

export function Timestamp(value) {
    return new Proxy({
        value: value,
        timestamp: Date.now(),
    }, {
        get: (target, key) => target[key],
        set: (target, key, value) => {
            if (key == 'value') {
                target.timestamp = Date.now();
                return target[key] = value;
            } return false;
        },
        defineProperty: (target, key, desc) => false,
        deleteProperty: (target, key) => false
    });
}

export function getFiles(directory) {
    return getAvaialbleFiles(directory).map(file => {
        let filePath = `${directory}\\${file.name}`;
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

export async function saveToNavbar(session, slug, displayName) {
    let rs = await session.sql(`
        insert into navbar (slug, display_name) 
        values (?, ?) 
        on duplicate key update display_name = ?`)
        .bind(slug, displayName, displayName).execute();
    let id = rs.getAutoIncrementValue();
    if (id) print(`checking navbar-item '${slug}'... created for \\${video.filePath.split('\\').splice(-2).join('\\')} `);
    else print(`checking navbar-item '${slug}'... exists`);
}

export async function saveToVideos(session, video) {
    const displayName = sanitize(video.fileName).split('.').slice(0, -1).join('.');

    await session.sql(
        `insert into videos (owner_id, display_name, file_name, file_path)
        values (1, '${displayName}', '${sanitize(video.fileName)}', '${sanitize(video.filePath)}')
        on duplicate key update file_name = '${sanitize(video.fileName)}'`
    ).execute();
}