import express, { json, urlencoded } from 'express';
import { initialize, getConnection } from './src/database.js';
import { getFiles, saveToNavbar, saveToVideos } from './src/utils.js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';

dotenv.config();

getConnection().then(async (session) => {
    await initialize(session);

    // path to root-directory of videos
    let files = getFiles(process.env.video_dir);
    for (let i = 0; i < files.length; i++) {
        let file = files[i];

        let stats = fs.lstatSync(file.filePath);
        if (stats.isDirectory()) {
            await saveToNavbar(session, file);

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
    console.log();
});

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(cors());
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true }));

import Navbar from './src/pages/navbar.js'
import LoginPage from './src/pages/login.js'
import RegisterPage from './src/pages/register.js'
import { ProfileUpdate, ProfilePage, ProfileAvatarPage } from './src/pages/profile.js'
import { VideoUpload, VideoStream, VideoDetails, VideoUpdate, VideoSearch, VideoPreview } from './src/pages/video.js'

app.post('/navbar', (req, res) => Navbar(req, res));
app.post('/login', (req, res) => LoginPage(req, res));
app.post('/register', (req, res) => RegisterPage(req, res));

app.get /**/('/video/preview/:video', (req, res) => VideoPreview(req, res));
app.get /**/('/video/:ID', (req, res) => VideoStream(req, res));
app.post/**/('/video/upload', upload.single('file'), (req, res) => VideoUpload(req, res));
app.post/**/('/video/details', (req, res) => VideoUpdate(req, res));
app.get /**/('/video/details/:ID', (req, res) => VideoDetails(req, res));

app.post/**/('/videos/:a/:b/:c?', (req, res) => VideoSearch(req, res));

app.get /**/('/profile/avatar/:ID', (req, res) => ProfileAvatarPage(req, res));
app.post/**/('/profile/update', (req, res) => ProfileUpdate(req, res));
app.post/**/('/profile/:ID', (req, res) => ProfilePage(req, res));

app.listen(8888, () => console.log(`
ONLIN 
     x
     x      Server is now online
     x         localhost:8888
     x
     .
ONLINE
`));