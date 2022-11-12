import { useRef, useEffect, useState } from 'react';
import Link from 'next/Link';

import * as User from '/lib/models/user';
import * as Video from '/lib/models/video';

import Navbar from '/components/navbar';
import Avatar from '/components/avatar';
import Alert from '/components/alert';
import PeepoHeart from '/components/peepo-heart';
import VideoFeed from '/components/video-feed';
import VideoPreview from '/components/video-preview';

/**
 * Display a page showcasing the target user's videos
 * 
 * @param {/lib/models/user} user the local user object stored in document.cookie
 * @param {/lib/models/user} remote the remote user object; subject of the page
 */
export default function Profile({ user, target }) {

    const [renders, setRenders] = useState([]);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // collection of videos uploaded by the target user
    const videos = [];
    // boolean: true if the profile page is the current user (the user that's logged-in)
    const self = user && user.ID == target.ID;

    const onVideosError = (event) => setError(`${event.message}`);
    const onUserLiked = (event) => setError('Currently unavailable');
    const onUpdateAvatar = (event) => {
        setError('');
        setSuccess('');

        // get files from event on the dataTransfer object as an array
        let files = [...event.dataTransfer.files];
        if (!files || files.length < 1) return;
        // only want 1 file, and it should be a picture
        if (files.length > 1) return setError('Only upload 1 file');
        switch (files[0].type) {
            default: return setError('Only images are allowed');
            case 'image/gif':
            case 'image/jpeg':
            case 'image/png':
            case 'image/webp':
                break;
        }

        // convert the image to base64 data and submit it for update
        getBase64(files[0], (image) => {
            if (event.target.tagName == 'IMG') {
                event.target.src = image;
            }

            user.avatar = image;

            fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/profile/update`, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                'headers': {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'avatar',
                    value: user
                })
            })
                .then(rs => rs.json())
                .then(rs => {
                    if (rs.error) setError(rs.error);
                    else if (rs.success) setSuccess(rs.success);
                })
                .catch(e => {
                    setError(`Failed to update avatar: ${e}`);
                });
        });
    };
    const onVideosLoaded = (res) => {
        if (res.error) {
            setError(res.error);
            return;
        }
        for (let i = 0; i < res.length; i++) {
            let video = Video.fromObject(res[i]);
            if (!videos.find(v => video.ID == v.ID)) {
                videos.push(video);
            }
        }
        setRenders([...videos].map(video => <VideoPreview key={video.ID} avatar={false} video={video} />));
    };

    useEffect(() => {
        window.onscroll = (event) => {
            const pb = Math.ceil(window.innerHeight + window.scrollY);
            const h = document.body.offsetHeight;
            if (pb < h) return;
            Video.fetchVideos(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/user/${target.ID}/${videos.length}`, onVideosLoaded, onVideosError);
        };

        Video.fetchVideos(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/user/${target.ID}/0`, onVideosLoaded, onVideosError);
    }, [])

    return (
        <>
            <Alert type={'success'} className={'fixed top-24 md:right-6'} message={success} dismiss={(e) => setSuccess('')} />
            <Alert className={'fixed top-24 md:right-6'} message={error} dismiss={(e) => setError('')} />

            <div className="flex min-h-screen">
                <Navbar />

                <div className="p-6 container mx-auto truncate">
                    <span className="text-center text-7xl md:text-9xl sticky bottom-0 text-white/40 font-mono -z-50 w-screen overflow-hidden whitespace-pre-wrap truncate">
                        {target.username}.
                    </span>

                    <div className="grid grid-cols-12 gap-6">

                        {/* first */}
                        <div className="col-span-full lg:col-span-4 xl:col-span-3 space-y-3">

                            {/* user panel */}
                            <div className="rounded bg-zinc-800/75 backdrop-blur shadow">
                                <div onDrop={onUpdateAvatar} className="py-8 px-14" >
                                    <Avatar user={target.ID} />
                                    <p className="text-2xl font-bold my-4 text-center truncate">{target.displayName || target.username}</p>
                                    <p className="text-sm text-center">{`@${target.username}`}</p>
                                </div>

                                <div className="grid grid-cols-3 text-center">
                                    <div className={`${!self ? 'w-full col-span-3' : ''} hover:bg-white/5 hover:cursor-pointer border-t-2 border-t-red-300`}>
                                        {!self ? <PeepoHeart onClick={onUserLiked} /> :
                                            <Link href="/upload">
                                                <i className="fa-solid fa-cloud-arrow-up p-8"></i>
                                            </Link>
                                        }
                                    </div>
                                    {!self ? '' :
                                        <div className="hover:bg-white/5 hover:cursor-pointer border-l border-l-black border-t-teal-300 border-t-2">
                                            <Link href="/settings"><i className="fa-solid fa-gear p-8"></i></Link>
                                        </div>
                                    }
                                    {!self ? '' :
                                        <div className="hover:bg-white/5 hover:cursor-pointer border-l border-l-black border-t-yellow-300 border-t-2">
                                            <a href="/logout"><i className="fa-solid fa-door-open p-8"></i></a>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>

                        {/* second */}
                        <div className="col-span-full lg:col-span-8 xl:col-span-9">
                            <VideoFeed videos={renders} className="grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
                        </div>
                    </div>
                </div>
            </div >
        </>
    );
}

export async function getServerSideProps({ req, res, params }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } };

    const { username } = params;
    let target = null, user = null;

    try {
        target = await User.getProfile(username);
        user = await User.verifyUser(req.cookies.user);
    } catch (error) {
        console.log('failed to retrieve users', error.message);
    }

    if (!target) return redirect('/');
    else if (!isNaN(parseInt(username))) return redirect(`/profile/${target.username}`);
    if (user && user.error) return redirect('/logout');

    return {
        props: {
            user: user,
            target: target,
        }
    };
};

const getBase64 = (file, callback) => {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => callback(reader.result);
};