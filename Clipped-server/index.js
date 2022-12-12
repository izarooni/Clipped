import express, { json, urlencoded } from 'express';
import { initialize, getConnection } from './src/database.js';
import * as dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';

dotenv.config();

getConnection().then((session) => initialize(session));

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(cors({
    origin: '*'
}));
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true }));

import Navbar from './src/pages/navbar.js'
import LoginPage from './src/pages/login.js'
import RegisterPage from './src/pages/register.js'
import * as ProfileHandler from './src/pages/profile.js'
import * as VideoHandler from './src/pages/video.js'

app.post('/navbar',   /**/(req, res) => Navbar(req, res));
app.post('/login',    /**/(req, res) => LoginPage(req, res));
app.post('/register', /**/(req, res) => RegisterPage(req, res));

// watch video
app.get /**/('/video/:ID',                          /**/(req, res) => VideoHandler.VideoStream(req, res));
// upload video file
app.post/**/('/video/upload', upload.single('file'),/**/(req, res) => VideoHandler.VideoUpload(req, res));
// update video details
app.post/**/('/video/update' ,                      /**/(req, res) => VideoHandler.VideoUpdate(req, res));
// retrieve video details
app.post/**/('/video/details/:ID',                  /**/(req, res) => VideoHandler.VideoDetails(req, res));
// retrieve video thumbnail
app.get /**/('/video/preview/:ID',                  /**/(req, res) => VideoHandler.VideoPreview(req, res));
// submit video comment
app.post/**/('/video/comment/:ID',                  /**/(req, res) => VideoHandler.VideoComment(req, res));
// load video comments
app.post/**/('/video/comments/:ID/:thread?',        /**/(req, res) => VideoHandler.VideoComments(req, res));

// browse videos
app.post/**/('/videos/:a/:b/:c?', (req, res) => VideoHandler.VideoSearch(req, res));

app.get /**/('/profile/avatar/:ID', /**/(req, res) => ProfileHandler.ProfileAvatarPage(req, res));
app.post/**/('/profile/friend/:ID?',/**/(req, res) => ProfileHandler.ProfileAddFriend(req, res));
app.post/**/('/profile/update',     /**/(req, res) => ProfileHandler.ProfileUpdate(req, res));
app.post/**/('/profile/:ID',        /**/(req, res) => ProfileHandler.ProfilePage(req, res));

app.listen(8888, () => console.log(`
ONLIN 
     x
     x      Server is now online
     x         localhost:8888
     x
     .
ONLINE
`));