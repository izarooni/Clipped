import { useRef, useEffect, useState } from 'react';

import * as User from '/lib/models/user';
import * as Video from '/lib/models/video';

import Alert from '/components/alert';
import Navbar from '/components/navbar';
import VideoFeed from '/components/video-feed';
import VideoPreview from '/components/video-preview';

export default function Upload({ user }) {
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [renders, setRenders] = useState('');
    const uploadForm = useRef(null);
    const videos = [];

    const loadPrivateVideos = () => Video.fetchVideos(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/private/${user.ID}`, onVideosReceived, onVideosError);
    const onMsgResult = (res) => {
        if (res.success) setSuccess(res.success);
        if (res.error) setError(res.error);
    };
    const onFileDialogue = (event) => {
        let input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            var file = e.target.files[0];
            sendVideoUpload([file]);
        }
        input.click();
    };
    const onVideoUpload = (event) => {
        event.preventDefault();
        sendVideoUpload(event.dataTransfer.files);
    };
    const onVideosReceived = (res) => {
        onMsgResult(res);
        for (let i = 0; i < res.length; i++) {
            let video = Video.fromObject(res[i]);
            if (!videos.find(v => video.ID == v.ID)) {
                videos.push(video);
            }
        }
        setRenders([...videos].map(video => <VideoPreview video={video} />));
    };
    const onVideosError = (e) => setError(`Failed to load videos: ${e}`);

    const sendVideoUpload = (arr) => {
        setError(''); setSuccess('');

        const files = [...arr];
        if (files.length > 1) return setError('Only upload 1 file');
        else if (files.length < 1) return setError('Requires at least 1 file');
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
                .then(res => res.json())
                .then((res) => {
                    onMsgResult(res);
                    loadPrivateVideos();
                })
                .catch(e => {
                    setError(`Failed to upload video: ${e}`);
                });
        } else setError('Only .mp4 files are allowed right now');
    }

    useEffect(() => loadPrivateVideos(), []);

    return (
        <>
            <Alert type={'success'} className={'fixed top-24 md:right-6'} message={success} dismiss={(e) => setSuccess('')} />
            <Alert className={'fixed top-24 md:right-6'} message={error} dismiss={(e) => setError('')} />
            <div className="flex">
                <Navbar />

                <div className="container mx-auto p-6">

                    <form className="hidden" ref={uploadForm} encType="multipart/form-data"></form>

                    <div onClick={onFileDialogue} onDrop={onVideoUpload} className="p-24 rounded border border-white/10 bg-zinc-800/20 mb-4 text-center space-x-2 text-2xl text-white/25 cursor-pointer select-none">
                        <i className="fa-solid fa-file-video"></i>
                        <span>Drop Video Files Here</span>
                    </div>

                    <div>
                        <p className="font-bold mb-3">Drafts</p>
                        <VideoFeed videos={renders} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" />
                    </div>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ req, res, params }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } };

    const user = await User.verifyUser(req.cookies.user);
    if (user.error) return redirect('/logout');

    return {
        props: {
            user: user
        }
    };
}