import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import * as Time from '/lib/time';
import * as User from '/lib/models/user';
import Avatar from '/components/avatar';

export default function Comment({ onMsgResult, data }) {
    let deleteTimestamp;
    const commentEl = useRef(null);
    const messageEl = useRef(null);
    const replyButtonEl = useRef(null);
    const deleteButtonEl = useRef(null);
    const contextMenuEl = useRef(null);
    const [comments, setComments] = useState('');

    const unavailable = (e) => { };
    const toggleSpoiler = (e) => {
        let clamp = messageEl.current.classList.toggle('line-clamp-4');
        e.target.innerHTML = clamp ? 'Read more' : 'Read less';
    };
    const toggleChildren = (e) => {
    };

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/comments/${data.videoID}/${data.ID}`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache'
        })
            .then(res => res.json())
            .then((res) => {
                let temp = [];
                for (let i = 0; i < res.length; i++) {
                    let comment = res[i];
                    temp.push(<Comment key={comment.ID} data={comment} onMsgResult={onMsgResult} />);
                }
                setComments(temp);
            });

        if (deleteButtonEl.current) {
            let el = deleteButtonEl.current;
            el.onmousedown = (e) => deleteTimestamp = Date.now();
            el.onmouseup = (e) => {
                // empty the messages
                onMsgResult({ 'error': '', 'success': '' });
                if (Date.now() - deleteTimestamp < 1000) return onMsgResult({ 'error': 'Hold the delete button for longer...' });

                fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/comment/${data.videoID}`, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'action': 'delete',
                        'user': user,
                        'comment': data,
                    })
                })
                    .then(res => res.json())
                    .then((res) => {
                        onMsgResult(res);
                        if (res.success) commentEl.current.classList.add('hidden');
                    });
            };

            const cookie = document.cookie.split(';')[0].split('=')[1];
            const user = User.fromCookie(cookie);
            if (user && user.ID == data.ownerID) {
                contextMenuEl.current.classList.remove('hidden');
            }
        }
    }, []);

    return (
        <div key={data.ID} ref={commentEl} className="flex items-start space-x-3">
            <Avatar user={data.ownerID} className="w-16" />
            <div className="relative flex flex-col">
                <div ref={contextMenuEl} className="absolute -top-1 -right-16 dropdown hidden">
                    <i className="fa-solid fa-grip-lines transition-all rounded-full p-2 hover:bg-gray-500/40 cursor-pointer"></i>

                    <div className="dropdown-menu absolute hidden text-gray-700 pt-1">
                        <button className="rounded-t bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800">Edit</button>
                        <button ref={deleteButtonEl} className="rounded-b relative overflow-hidden
                                bg-neutral-700 hover:bg-neutral-600 active:bg-transparent
                                after:transition-all after:duration-1000
                                after:block after:w-full after:bg-red-800
                                after:h-0 active:after:h-full
                                after:absolute after:bottom-0 after:left-0 after:-z-10">Delete</button>
                    </div>
                </div>

                <p className="text-sm space-x-3">
                    <Link href={`/profile/${data.ownerID}`}>
                        <span className="font-bold cursor-pointer">{data.ownerDisplayName}</span>
                    </Link>
                    <span className="text-white/80">{Time.toString(data.createdAt)}</span>
                </p>

                <p ref={messageEl} className="whitespace-pre line-clamp-4">{data.message}</p>

                <div className="mt-2">
                    <p onClick={toggleSpoiler} className="inline p-1 font-bold text-white/80 cursor-pointer select-none">Read more</p>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="cursor-pointer px-2 py-1">
                        <i onClick={unavailable} className="fa-solid fa-thumbs-up transition-all rounded-full p-2 hover:bg-gray-500/40"></i>
                        <span className="select-none">{data.likes}</span>
                    </div>
                    <div className="cursor-pointer px-2 py-1">
                        <i onClick={unavailable} className="fa-solid fa-thumbs-down transition-all rounded-full p-2 hover:bg-gray-500/40"></i>
                        <span className="select-none">{data.dislikes}</span>
                    </div>
                    <p ref={replyButtonEl} className="cursor-pointer px-2 py-1 text-blue-500 font-bold">Reply</p>
                </div>

                <div className="flex mt-6 ml-6">
                    {comments}
                </div>
            </div>
        </div>
    );
}