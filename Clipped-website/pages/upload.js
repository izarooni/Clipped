import { useRef, useEffect, useState } from 'react';

import * as User from '/lib/models/user';
import * as Video from '/lib/models/video';

import Alert from '/components/alert';
import Navbar from '/components/navbar';
import VideoFeed from '/components/video-feed';
import VideoPreview from '/components/video-preview';

export default function Upload({ user }) {
    const videos = [];
    const uploadForm = useRef(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [renders, setRenders] = useState('');

    const loadPrivateVideos = () => Video.fetchVideos(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/private/${user.ID}`, onVideosReceived, onVideosError);

    const onVideoUpload = (event) => {
        event.preventDefault();

        const files = [...event.dataTransfer.files];
        if (files.length != 1) return setError('Only upload 1 file');
        const file = files[0];

        if (file.type == 'video/mp4') {
            let fd = new FormData(uploadForm.current);
            fd.append('user', JSON.stringify(user));
            fd.append('file_details', JSON.stringify({
                name: file.name,
                type: file.type,
            }));
            fd.append('file', file);

            fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/upload`, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                body: fd,
            })
                .then(rs => rs.json())
                .then(rs => {
                    if (rs.error) setError(rs.error);
                    else if (rs.success) setSuccess(rs.success);
                    loadPrivateVideos();
                })
                .catch(e => {
                    setError(`Failed to upload video: ${e}`);
                });
        }
    };

    const onVideosReceived = (r) => {
        if (r.error) {
            setError(r.error);
            return;
        }
        for (let i = 0; i < r.length; i++) {
            let video = Video.fromObject(r[i]);
            if (!videos.find(v => video.ID == v.ID)) {
                videos.push(video);
            }
        }
        setRenders([...videos].map(video => <VideoPreview video={video} />));
    };
    const onVideosError = (e) => setError(`${e}`);

    useEffect(() => loadPrivateVideos(), []);

    return (
        <div className="flex">
            <Navbar />

            <div className="container mx-auto p-6">
                <Alert type={'success'} className={'fixed top-24 right-6'} message={success} dismiss={(e) => setSuccess('')} />
                <Alert className={'fixed top-24 right-6'} message={error} dismiss={(e) => setError('')} />

                <form class="hidden" ref={uploadForm} encType="multipart/form-data"></form>

                <div onDrop={onVideoUpload} className="p-24 rounded border border-white/10 bg-zinc-800/20 mb-4 text-center space-x-2 text-2xl text-white/25">
                    <i className="fa-solid fa-file-video"></i>
                    <span>Drop Video Files Here</span>
                </div>

                <div>
                    <p className="font-bold mb-3">Drafts</p>
                    <VideoFeed videos={renders} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" />
                </div>
            </div>
        </div>
    );
}

export async function getServerSideProps({ req, res, params }) {
    let localUser = User.fromCookie(req.cookies.user);
    const local = !localUser ? null : await User.getUser(localUser.ID);

    if (!local || local && local.error) return redirect('/logout');

    return {
        props: {
            user: local
        }
    };
}