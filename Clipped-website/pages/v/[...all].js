import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as Time from '/lib/time';
import * as User from '/lib/models/user';

import Avatar from '/components/avatar';
import Alert from '/components/alert';
import Navbar from '/components/navbar';

export default function Video({ video, owner, user }) {
    const Router = useRouter();
    const title = useRef(null);
    const description = useRef(null);

    const [editable, setEditable] = useState(false);
    const [likes, setLikes] = useState(video.likes);
    const [dislikes, setDislikes] = useState(video.dislikes);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const unavailable = (e) => setError('Currently unavailable.');
    const onMsgResult = (res) => {
        if (res.success) setSuccess(res.success);
        if (res.error) setError(res.error);
    };
    const sendUpdateVideo = async (action) => {
        return fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/details`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // public: no user required
                // private: user auth required
                'action': action,
                // optional: depends on <action>
                'user': user,
                // the video object, typically containing limited data
                // this fetch will retrieve the rest of the data
                'video': video,
            }),
        }).then(res => res.json());
    };

    const onSubmitComment = unavailable;

    const onSubmitLike = (e) => {
        setError(''); setSuccess('');
        setLikes(video.likes += 1);
        sendUpdateVideo('public').then(res => {
            if (res.error) setError(res.error);
        });
    };
    const onSubmitDislike = (e) => {
        setError(''); setSuccess('');
        setDislikes(video.dislikes += 1);
        sendUpdateVideo('public').then(res => {
            if (res.error) setError(res.error);
        });
    };

    const onSetVideoPrivate = (e) => {
        setError(''); setSuccess('');
        if (!user) return;
        video.private = 0;
        sendUpdateVideo('private').then(onMsgResult);
    };
    const onSetVideoPublic = (e) => {
        setError(''); setSuccess('');
        video.private = 1;
        sendUpdateVideo('private').then(onMsgResult);
    };
    const onSetVideoProps = (e) => {
        if (!editable) return;
        setError(''); setSuccess('');

        const sTitle = title.current.value || video.fileName;
        const sDescription = description.current.value || '';

        video.displayName = sTitle;
        video.description = sDescription;
        sendUpdateVideo('private').then(onMsgResult);
    };

    var deleteTimestamp;
    const onDeleteDown = () => deleteTimestamp = Date.now();
    const onDeleteUp = () => {
        setError(''); setSuccess('');
        let elapsed = Date.now() - deleteTimestamp;
        if (elapsed < 1000) return setError('Hold the delete button longer...');
        video.delete = true;
        sendUpdateVideo('private').then(res => {
            onMsgResult(res);
            setTimeout(() => {
                Router.back();
            }, 1200);
        });
    };

    const onShowSettings = (e) => setEditable(!editable);

    useEffect(() => {
        if (title.current) title.current.value = video.displayName;
        if (description.current) description.current.value = video.description;
    }, [editable]);

    return (
        <>
            <Alert type={'success'} message={success} className="fixed top-24 right-6" dismiss={(e) => setSuccess('')} />
            <Alert message={error} className="fixed top-24 right-6" dismiss={(e) => setError('')} />
            <div className="flex min-h-screen">
                <Navbar />

                <div className="p-5 container mx-auto">

                    <video className="w-full mx-auto" controls playsInline>
                        <source src={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/${video.ID}#t=0.001`} type="video/mp4" />
                    </video>

                    <div className="flex justify-between items-center xl:px-12 py-2">
                        <div className="flex flex-col truncate">
                            <p className="text-2xl">{video.displayName}</p>
                            <p className="mb-1">
                                {video.views} views &middot; {Time.toString(Date.now() - video.createdAt)}
                            </p>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-center transition-all hover:text-green-500 active:text-green-600">
                                <button onClick={onSubmitLike} className="px-6 py-2">
                                    <i className="fa-solid fa-thumbs-up"></i>
                                    <p>{likes}</p>
                                </button>
                            </div>
                            <div className="text-center transition-all hover:text-red-500 active:text-red-600">
                                <button onClick={onSubmitDislike} className="px-6 py-2">
                                    <i className="fa-solid fa-thumbs-down"></i>
                                    <p>{dislikes}</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row space-y-4 border-t border-t-white/10 p-4">
                        <div className="flex space-x-4">
                            <Avatar user={video.ownerID} className="w-12" />

                            <div className="flex flex-col">
                                <p className="text-xl">{owner.displayName}</p>
                                <p className="text-sm">{video.description}</p>
                            </div>
                        </div>

                        <div className="flex-grow flex items-center justify-center md:justify-end p-4 space-x-2">
                            {(() => {
                                return video.private
                                    // show the private icon when private
                                    ? <i onClick={onSetVideoPrivate} className="fa-solid fa-lock py-3 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 cursor-pointer"></i>
                                    // show 'open' icon only if the current user session also owns the video
                                    : (!user || user.ID != owner.ID) ? '' :
                                        <i onClick={onSetVideoPublic} className="fa-solid fa-lock-open py-3 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 cursor-pointer"></i>

                            })()}
                            {(() => {
                                if (!user || user.ID != video.ownerID) return;

                                if (editable) {
                                    return (
                                        <>
                                            <i onClick={onSetVideoProps} className="fa-regular fa-floppy-disk py-3 px-8 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-green-500/60 active:bg-green-600/60 cursor-pointer" type="button"></i>
                                            <i onClick={onShowSettings} className="fa-solid fa-ban py-3 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-red-500/60 active:bg-red-600/60 cursor-pointer" type="button"></i>
                                        </>
                                    );
                                } else return (
                                    <i onClick={onShowSettings} className="fa-solid fa-pencil py-3 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 cursor-pointer"></i>
                                );
                            })()}
                        </div>
                    </div>

                    {!editable ? '' :
                        <>
                            <div className="p-4 grid gap-4">
                                <label className="-mb-2 text-sm">Title</label>
                                <input ref={title} className="flex-grow rounded p-1 bg-transparent outline outline-1 outline-white/40 hover:outline-white/60" type="text" placeholder={video.displayName} />

                                <label className="-mb-2 txt-sm">Description</label>
                                <textarea ref={description} className="flex-grow rounded p-1 bg-transparent outline outline-1 outline-white/40 hover:outline-white/60" type="text" />

                                <div className="text-end">
                                    <button onMouseDown={onDeleteDown} onMouseUp={onDeleteUp} className="hold-button outline-red-500 after:bg-red-600" type="button">Delete Video</button>
                                </div>
                            </div>
                        </>}

                    <div className="space-y-6 border-t border-t-white/10">
                        {!user ? '' :
                            <div className="w-full space-y-2 py-6">
                                <div className="flex w-full">
                                    <Avatar user={user.ID} className="w-12 mr-4" />
                                    <textarea className="bg-transparent p-2 rounded border border-white/10 w-full resize-none focus:outline-none" placeholder="Add a comment..."></textarea>
                                </div>
                                <div className="w-full text-end">
                                    <button onClick={onSubmitComment} className="bg-blue-500 px-5 py-3 rounded transition-all hover:bg-blue-600 active:bg-blue-700">submit</button>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ req, params }) {
    let res = await fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/details/${params.all[0]}`, {
        method: 'GET',
        cache: 'no-cache',
        'headers': {
            'Content-Type': 'application/json'
        },
    });

    const video = await res.json();
    const owner = await User.getProfile(video.ownerID);
    let user = await User.verifyUser(req.cookies.user);
    if (user.error) user = null;

    return {
        props: {
            video,
            owner,
            user,
        }
    };
}