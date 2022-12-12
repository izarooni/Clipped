import { useRef, useEffect, useState } from 'react';
import * as User from '/lib/models/user';
import Alert from '/components/alert';
import Navbar from '/components/navbar';

export default function Settings({ user }) {
    const displayNameEl = useRef(null);
    const newPasswordEl = useRef(null);
    const passwordEl = useRef(null);
    const overlayEl = useRef(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [displayName, setDisplayName] = useState(user.displayName);

    const onLogin = (e) => {
        setError(''); setSuccess('');
        if (e && e.which && e.which != 13) return; // Enter

        let local = User.fromObject({
            username: user.username,
            password: passwordEl.current.value,
            loginToken: user.loginToken,
        });

        if (!local) return;
        local = JSON.stringify(local);
        User.verifyUser(local).then(rs => {
            if (!rs) setError('Unknown error');
            else if (rs.error) setError(rs.error);

            // if the remote user loginToken doesn't match we are not in a valid login session
            // re-enter the password to renew the session
            else if (rs.loginToken == user.loginToken) {
                overlayEl.current.classList.add('hidden');
                setSuccess('Login token validated');
            } else setError('Invalid login session');
        }).catch(e => setError(`${e}`));
    };
    var saveTimestamp;
    const onSaveDown = (e) => saveTimestamp = Date.now();
    const onSaveUp = (e) => {
        setError(''); setSuccess('');

        if (Date.now() - saveTimestamp < 1000) return setError('Hold the save button longer...');

        setDisplayName(user.displayName = displayNameEl.current.value);
        document.cookie = User.generateCookie(user);

        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/profile/update`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            'headers': {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'settings',
                localUser: user,
                newPassword: newPasswordEl.current.value,
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
    };

    useEffect(() => {
        onLogin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="flex">
            <Navbar />

            <div ref={overlayEl} className="z-50 fixed h-screen w-screen bg-black/80 flex items-center justify-center flex-col">
                <p className="text-4xl p-12 font-mono text-white/60">Enter Password</p>
                <div className="flex items-baseline space-x-4 text-xl">
                    <input onKeyPress={onLogin} ref={passwordEl} type="password" className="
                    p-1 bg-transparent outline-none
                    border-b border-b-white/80" />
                    <i onClick={onLogin} className="fa-solid fa-door-closed p-2 cursor-pointer"></i>
                </div>
            </div>

            <div className="container mx-auto p-3">
                <Alert type={'success'} className={'fixed top-24 right-6'} message={success} dismiss={(e) => setSuccess('')} />
                <Alert className={'fixed top-24 right-6'} message={error} dismiss={(e) => setError('')} />


                <div className="flex flex-col space-y-4 whitespace-nowrap">
                    <button onMouseDown={onSaveDown} onMouseUp={onSaveUp} className="text-xl py-2 px-4 hold-button outline-green-500/50 after:bg-green-600" type="button">
                        <i className="fa-regular fa-floppy-disk mr-4"></i>
                        <span>Save Changes</span>
                    </button>

                    <div className="flex items-center">
                        <label className="pr-16">Display Name</label>
                        <div className="flex flex-col w-full">
                            <input ref={displayNameEl} placeholder={displayName} className="flex-grow bg-transparent focus:outline-none p-1 rounded border border-white/10 py-2 px-4" type="text" />
                            <small className="ml-2 italic text-white/60">Leave blank to reset</small>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <label className="pr-16">New Password</label>
                        <div className="flex flex-col w-full">
                            <input ref={newPasswordEl} className="flex-grow bg-transparent focus:outline-none p-1 rounded border border-white/10 py-2 px-4" type="password" />
                            <small className="ml-2 italic text-white/60">Leave blank to ignore</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export async function getServerSideProps({ req, res, params }) {
    const user = await User.verifyUser(req.cookies.user);
    if (user.error) return redirect('/logout');

    return {
        props: {
            user: user
        }
    };
}