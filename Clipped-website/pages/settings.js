import { useRef, useEffect, useState } from 'react';
import Alert from '/components/alert';
import * as User from '/lib/models/user';

export default function Settings({ user }) {
    const iDisplayName = useRef(null);
    const [error, setError] = useState('');
    const [displayName, setDisplayName] = useState(user.displayName);

    const onResetProfile = (e) => {
        setDisplayName(user.displayName);
        iDisplayName.current.value = '';
    };
    const onSaveProfile = (e) => {
        setError('');

        user.displayName = iDisplayName.current.value;
        document.cookie = `user=${JSON.stringify(user)};path=/;Max-Age=86400000`;

        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/profile/update`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            'headers': {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'name',
                value: user,
            })
        })
            .then(rs => rs.json())
            .then(rs => {
                if (rs.error) setError(rs.error);
            })
            .catch(e => {
                setError(`Failed to update avatar: ${e}`);
            });
    };

    return (
        <>
            <div className="container mx-auto">
                <Alert className={'fixed top-24 right-6'} message={error} dismiss={(e) => setError('')} />

                <div className="flex flex-col space-y-4 rounded p-3 pb-12">
                    <div className="flex items-center space-x-4">
                        <button onClick={onResetProfile} className="fa-solid fa-ban  text-xl py-2 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 hover:cursor-pointer" type="button"></button>
                        <button onClick={onSaveProfile} className="fa-regular fa-floppy-disk text-xl py-2 px-4 rounded outline outline-1 outline-white/10 transition-all hover:outline-0 hover:bg-white/20 active:bg-white/10 hover:cursor-pointer" type="button"></button>
                    </div>

                    <input ref={iDisplayName} placeholder={displayName} className="bg-transparent focus:outline-none p-1 rounded border border-white/10 py-2 px-4" type="text" />
                </div>
            </div>
        </>
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