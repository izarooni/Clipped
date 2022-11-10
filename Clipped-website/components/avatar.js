import Link from 'next/link';

export default function Avatar({ user, className }) {
    className ||= '';

    return (
        <div className={`flex justify-center items-center ${className}`}>
            <Link href={`/profile/${user}`}>
                <img className="aspect-square object-cover rounded-full border border-black/40 hover:cursor-pointer" src={`${process.env.NEXT_PUBLIC_STREAM_SERVER}/profile/avatar/${user}`} width={128} height={128} alt="" />
            </Link>
        </div>
    );
}