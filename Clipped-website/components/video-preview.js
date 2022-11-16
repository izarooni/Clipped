import Link from 'next/link';
import * as Time from '/lib/time';
import Avatar from '/components/avatar';

const play = (e) => { if (e.target.readyState == 4) e.target.play(); }
const pause = (e) => { if (e.target.readyState == 4) e.target.pause(); }


/**
 * converts the loaded serialized video data into an
 * interactive front-end element
 * 
 * @param {/lib/models/video} video a Video structure
 */
export default function VideoPreview({ avatar, video }) {
    if (!video || !video.ID) return;

    const showAvatar = avatar == undefined ? true : avatar;

    return (
        <div key={video.ID} className="flex flex-col space-y-1 w-full">
            {/* video element */}
            <div className="border border-black/40 bg-gray-500/10">
                <Link href={`/v/${video.ID}`}>
                    <video poster={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/preview/${video.ID}?type=image`} className="transition-all xl:hover:scale-105 hover:z-30 w-full hover:shadow cursor-pointer" loop muted playsInline preload="metadata" onMouseEnter={play} onMouseLeave={pause}>
                        <source src={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/video/preview/${video.ID}`} type="video/mp4" />
                    </video>
                </Link>
            </div>

            <div className="flex space-x-3">
                {!showAvatar ? '' :
                    <div className="flex-shrink">
                        <Avatar user={video.ownerID} className="w-16" />
                    </div>
                }

                <div className="relative flex-grow flex flex-col overflow-hidden">
                    <Link href={`/v/${video.ID}`}>
                        <a className="font-bold max-h-12 whitespace-normal break-words line-clamp-2">{video.displayName}</a>
                    </Link>
                    <p className="text-sm text-white/80">{video.ownerDisplayName}</p>
                    <p className="text-sm text-white/80">{`${video.views}`} views &middot; {Time.toString(video.createdAt)}</p>
                </div>
            </div>
        </div>
    );
}