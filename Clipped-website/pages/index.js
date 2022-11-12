import { useEffect, useState, useRef } from 'react';
import * as Video from '/lib/models/video';
import Alert from '/components/alert';
import Navbar from '/components/navbar';
import VideoFeed from '/components/video-feed';
import VideoPreview from '/components/video-preview';

export default function Home() {
    const [renders, setRenders] = useState([]);
    const [error, setError] = useState('');
    const videos = [];

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
        setRenders([...videos].map(video => <VideoPreview key={video.ID} video={video} />));
    };

    const onVideosError = (e) => setError(`videos failed to load: ${e.message}`);

    useEffect(() => {
        setError('');

        window.onscroll = (e) => {
            const pb = Math.ceil(window.innerHeight + window.scrollY);
            const h = document.body.offsetHeight;
            if (pb < h) return;
            Video.fetchVideos(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/popular/${videos.length}`, onVideosReceived, onVideosError);
        };

        Video.fetchVideos(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/videos/popular/0`, onVideosReceived, onVideosError);
    }, []);

    return (
        <>
            <Alert className="fixed top-24 md:right-6 md:w-1/2" message={error} />
            <div className="flex min-h-screen">
                <Navbar />

                <div className="p-6 container mx-auto">
                    <p className="font-bold mb-3">Popular</p>
                    <VideoFeed videos={renders} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" />
                </div>
            </div>
        </>
    );
}


/**
 * comparator for sorting video files from new to old
 * 
 * @param {*} a video data structure
 * @param {*} b video data structure
 * @returns 
 */
const NewOld = (a, b) => {
    if (a.fileAge > b.fileAge) return -1;
    else if (a.fileAge < b.fileAge) return 1;
    else return 0;
};

/**
 * comparator for sorting video files from old to new
 * 
 * @param {*} a video data structure
 * @param {*} b video data structure
 * @returns 
 */
const OldNew = (a, b) => {
    if (a.fileAge < b.fileAge) return -1;
    else if (a.fileAge > b.fileAge) return 1;
    else return 0;
};