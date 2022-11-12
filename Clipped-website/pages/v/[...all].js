import '@vidstack/player/define/vds-media.js';
import '@vidstack/player/define/vds-video.js';
import '@vidstack/player/define/dangerously-all-ui.js';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as Time from '/lib/time';
import * as User from '/lib/models/user';

import Avatar from '/components/avatar';
import Alert from '/components/alert';
import Navbar from '/components/navbar';
import Comment from '/components/comment';

export default function Video({ video, owner, user }) {
    const Router = useRouter();

    const titleInput = useRef(null);
    const descriptionEl = useRef(null);
    const descriptionInput = useRef(null);
    const commentInputEl = useRef(null);

    const [editable, setEditable] = useState(false);
    const [likes, setLikes] = useState(video.likes);
    const [dislikes, setDislikes] = useState(video.dislikes);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [comments, setComments] = useState('');

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
                // the video object, typically containing only basic properties
                'video': video,
            }),
        })
            .then(res => res.json());
    };

    const onSubmitComment = (e) => {
        setError(''); setSuccess('');
        let comment = commentInputEl.current.value;
        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/comment/${video.ID}`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'action': 'create',
                'user': user,
                'comment': comment,
            })
        })
            .then(res => res.json())
            .then((res) => {
                onMsgResult(res);
                if (res.success) loadComments();
            });
    };
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

        const sTitle = titleInput.current.value || video.fileName;
        const sDescription = descriptionInput.current.value || '';

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
    const loadComments = () => {
        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/comments/${video.ID}`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache'
        })
            .then(res => res.json())
            .then((res) => {
                onMsgResult(res);

                let temp = [];
                for (let i = 0; i < res.length; i++) {
                    let comment = res[i];
                    temp.push(<Comment key={comment.ID} data={comment} onMsgResult={onMsgResult} />);
                }
                setComments(temp);
            });
    };

    useEffect(() => {
        // reset input values when video settings are being edited
        if (titleInput.current) titleInput.current.value = video.displayName;
        if (descriptionInput.current) descriptionInput.current.value = video.description;
        if (descriptionEl.current) {
            descriptionEl.current.onmouseup = (e) => {
                descriptionEl.current.classList.toggle('line-clamp-2');
            };
        }
    }, [video, editable]);

    // initialize comments
    useEffect(() => loadComments(), [video]);

    return (
        <>
            <Alert type={'success'} message={success} className="fixed top-24 right-6" dismiss={(e) => setSuccess('')} />
            <Alert message={error} className="fixed top-24 right-6" dismiss={(e) => setError('')} />
            <div className="flex min-h-screen">
                <Navbar />

                <div className="p-5 container mx-auto">

                    {/* video player */}

                    <vds-media paused seeking waiting can-load can-play class="inline-block w-full">
                        {/* bring controls to front (container) */}
                        <div className="absolute w-full h-full z-10 opacity-100 media-user-idle:opacity-0">
                            {/* add controls (vignette overlay) */}
                            <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-black/75 to-transparent">

                                <vds-time-slider>
                                    <div className="slider-track"></div>
                                    <div className="slider-track slider-progress"></div>
                                    <div className="slider-thumb-container">
                                        <div className="slider-thumb"></div>
                                    </div>
                                </vds-time-slider>

                                <div className="absolute bottom-0 w-full flex justify-between px-5 mb-3">
                                    <div className="flex-1 flex items-center space-x-4">
                                        <vds-play-button class="vds-ui-control">
                                            {/* play svg */}
                                            <svg className="absolute h-full media-paused:opacity-100 opacity-0" viewBox="0 0 24 24">
                                                <path d="M7.7 4.192v15.616a.1.1 0 0 0 .156.082l11.319-7.887L7.856 4.11a.1.1 0 0 0-.157.082Z" fill="currentColor" />
                                            </svg>

                                            {/* pause svg */}
                                            <svg className="absolute h-full media-paused:opacity-0 opacity-100" viewBox="0 0 24 24">
                                                <path d="M5.45 4.5h4.5v15h-4.5v-15Zm8.599 0h4.5v15h-4.5v-15Z" fill="currentColor" />
                                            </svg>

                                        </vds-play-button>
                                        <vds-mute-button class="vds-ui-control">
                                            <svg className="absolute h-full media-muted:opacity-100 opacity-0" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M5.889 16H2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.889l5.294-4.332a.5.5 0 0 1 .817.387v15.89a.5.5 0 0 1-.817.387L5.89 16zm14.525-4 3.536 3.536-1.414 1.414L19 13.414l-3.536 3.536-1.414-1.414L17.586 12 14.05 8.464l1.414-1.414L19 10.586l3.536-3.536 1.414 1.414L20.414 12z" />
                                            </svg>

                                            <svg className="absolute h-full media-muted:opacity-0 opacity-100" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M5.889 16H2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.889l5.294-4.332a.5.5 0 0 1 .817.387v15.89a.5.5 0 0 1-.817.387L5.89 16zm13.517 4.134-1.416-1.416A8.978 8.978 0 0 0 21 12a8.982 8.982 0 0 0-3.304-6.968l1.42-1.42A10.976 10.976 0 0 1 23 12c0 3.223-1.386 6.122-3.594 8.134zm-3.543-3.543-1.422-1.422A3.993 3.993 0 0 0 16 12c0-1.43-.75-2.685-1.88-3.392l1.439-1.439A5.991 5.991 0 0 1 18 12c0 1.842-.83 3.49-2.137 4.591z" />
                                            </svg>

                                        </vds-mute-button>
                                        <vds-volume-slider class="w-1/5 hidden md:inline">
                                            <div className="slider-track"></div>
                                            <div className="slider-track slide-progress"></div>
                                            <div className="slider-thumb-container">
                                                <div className="slider-thumb"></div>
                                            </div>
                                        </vds-volume-slider>
                                        <div className="flex space-x-2 items-center h-12">
                                            <vds-time type="current"></vds-time>
                                            <span className="select-none pointer-events-none">/</span>
                                            <vds-time type="duration"></vds-time>
                                        </div>
                                    </div>

                                    <div className="flex-grow flex justify-end items-center">
                                        <vds-fullscreen-button class="vds-ui-control">
                                            <svg className="absolute h-full hidden media-fullscreen:inline" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M18 7h4v2h-6V3h2v4zM8 9H2V7h4V3h2v6zm10 8v4h-2v-6h6v2h-4zM8 15v6H6v-4H2v-2h6z" />
                                            </svg>
                                            <svg className="absolute h-full inline media-fullscreen:hidden" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M16 3h6v6h-2V5h-4V3zM2 3h6v2H4v4H2V3zm18 16v-4h2v6h-6v-2h4zM4 19h4v2H2v-6h2v4z" />
                                            </svg>
                                        </vds-fullscreen-button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <vds-aspect-ratio ratio="16/9">
                            {/* vds-video must be a direct child of vds-aspect-ratio */}
                            <vds-video poster={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/preview/${video.ID}?type=image`} autoplay>
                                <video src={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/${video.ID}`} preload="none" type="video/mp4" playsInline></video>
                            </vds-video>
                        </vds-aspect-ratio>
                    </vds-media>

                    <div className="flex justify-between items-center xl:px-12 py-2">
                        {/* video first-look stats */}
                        <div className="flex flex-col truncate">
                            <p className="text-2xl">{video.displayName}</p>
                            <p className="mb-1">
                                {video.views} views &middot; {Time.toString(video.createdAt)}
                            </p>
                        </div>

                        {/* like / dislike */}
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

                    {!video.description ? '' :
                        <div className="my-4">
                            <p ref={descriptionEl} className="whitespace-pre p-4 rounded transition-all hover:bg-white/10
                        line-clamp-2 cursor-pointer">{video.description}</p>
                        </div>
                    }

                    {/* video details */}
                    <div className="flex flex-col md:flex-row space-y-4 border-t border-t-white/10">
                        <div className="flex space-x-4 p-4 flex-grow">
                            <Avatar user={video.ownerID} className="w-12" />
                            <p className="text-xl">{owner.displayName}</p>
                        </div>

                        <div className="flex-grow flex items-center justify-center md:justify-end space-x-4 p-4">
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

                                return editable
                                    ? <button onClick={onShowSettings} className="fa-solid fa-ban py-3 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 cursor-pointer" type="button"></button>
                                    : <button onClick={onShowSettings} className="fa-solid fa-pencil py-3 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 cursor-pointer" type="button"></button>
                            })()}
                        </div>
                    </div>

                    {!editable ? '' :
                        <>
                            <div className="p-4 grid gap-4">
                                <label className="-mb-2 text-sm">Title</label>
                                <input ref={titleInput} className="flex-grow rounded p-1 bg-transparent outline outline-1 outline-white/40 hover:outline-white/60" type="text" placeholder={video.displayName} />

                                <label className="-mb-2 txt-sm">Description</label>
                                <textarea ref={descriptionInput} className="flex-grow rounded p-1 bg-transparent outline outline-1 outline-white/40 hover:outline-white/60 whitespace-pre" type="text" rows="5" />

                                <div className="text-end space-x-4">
                                    <button onClick={onSetVideoProps} className="p-2 rounded outline outline-1 outline-green-500 transition-all hover:outline-0 hover:bg-green-600 active:bg-green-600/60 cursor-pointer" type="button">Save Video</button>
                                    <button onMouseDown={onDeleteDown} onMouseUp={onDeleteUp} className="hold-button outline-red-500 after:bg-red-600" type="button">Delete Video</button>
                                </div>
                            </div>
                        </>}

                    <div className="space-y-6 border-t border-t-white/10">
                        {!user ? '' :
                            <div className="w-full space-y-2 mt-2">
                                <div className="flex w-full">
                                    <Avatar user={user.ID} className="w-12 mr-4" />
                                    <textarea ref={commentInputEl} className="bg-transparent p-3 rounded border border-white/10 w-full resize-none focus:outline-none" placeholder="Add a comment..." rows="4"></textarea>
                                </div>
                                <div className="w-full text-end">
                                    <button onClick={onSubmitComment} className="bg-blue-500 px-5 py-3 rounded transition-all hover:bg-blue-600 active:bg-blue-700">submit</button>
                                </div>
                            </div>
                        }

                        {comments}
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
    if (!user || user.error) user = null;

    return {
        props: {
            video,
            owner,
            user,
        }
    };
}