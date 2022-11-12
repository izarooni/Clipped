import React, { useState, useEffect, useRef } from 'react'
import * as Video from '/lib/models/video';
import Alert from '/components/alert';
import Navbar from '/components/navbar'
import VideoFeed from '/components/video-feed';
import VideoPreview from '/components/video-preview';

/**
 * @param {*} menu the navbar menu items (as loaded from database)
 * @param {*} categoryName the url slug (/browse/[ID], and [ID] is the slug)
 * @param {*} feed the container displaying video blocks
 * @param {*} server remote address where video/thumbnails are hosted
 */
export default function Browse({ categoryName }) {
    const endPoint = `${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/browse/${categoryName}`;
    const [renders, setRenders] = useState([]);
    const [error, setError] = useState('');
    const searchInput = useRef(null);
    const videos = [];

    const onResponse = (r) => {
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
        setRenders([...videos].map(video => <VideoPreview key={video.ID} video={video} />));
    };

    const onError = (e) => setError(`${e}`);

    // we'll use useEffect to update the video feed on the page whenever
    // the categoryName variable is changed (categoryName is our depdendncy)

    // with out a useEffect depedncy, the function will proc several times
    // we only want the feed to update on the following conditions
    // 1. the page must change (based on the URL slug)
    // 2. the user interacted with search input


    // 1. using [categoryName] as the second argument, this will tell useEffect to proc when the variable changes
    useEffect(() => {
        setError('');
        setRenders([]);
        searchInput.current.value = '';

        window.onscroll = (e) => {
            const pb = Math.ceil(window.innerHeight + window.scrollY);
            const h = document.body.offsetHeight;
            if (pb < h) return;
            Video.fetchVideos(`${endPoint}/${videos.length}`, onResponse, onError);
        };

        Video.fetchVideos(`${endPoint}/0`, onResponse, onError);
    }, [categoryName]);

    // 2. user interacted with input / search button
    let timeout = null;
    const onInput = (e) => {
        // wait a moment before sending the search query
        if (timeout) clearInterval(timeout);
        timeout = setTimeout(() => Video.fetchVideos(`${endPoint}/0`, onResponse, onError, { 'search': searchInput.current.value }), 200);
    }

    return (
        <>
            <Alert className="fixed top-24 right-6 whitespace-pre-wrap w-1/3" message={error} dismiss={(e) => setError('')} />
            <div className="flex min-h-screen">
                <Navbar />

                <div className="p-5 container mx-auto">
                    {/* video search */}
                    <div className="font-bold my-8 text-4xl flex items-center w-2/3 mx-auto">
                        <span className="mr-4">&raquo;</span>
                        <input ref={searchInput} className="relative w-full bg-transparent text-bold focus:outline-none" type="text" id="search" placeholder="search..." onKeyUp={onInput} />
                        <button onClick={onInput}><i className="fa-solid fa-magnifying-glass rounded-full p-2 transition-all hover:ring hover:ring-white/10 active:bg-white/20"></i></button>
                    </div>

                    {/* realtime video count value */}
                    <div className="mb-2 flex justify-end items-center">
                        <p className="font-mono text-sm border-r border-white/10 pr-4">{renders.length} video{renders.length == 1 ? '' : 's'}</p>
                    </div>

                    <VideoFeed videos={renders} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" />
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps({ params }) {
    return {
        props: {
            categoryName: params.ID,
        }
    };
}