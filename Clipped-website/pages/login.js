import React, { useState, useRef } from 'react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import Alert from '/components/alert';
import Navbar from '/components/navbar';
import * as User from '/lib/models/user';

export default function Login() {
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [privacy, setPrivacy] = useState(true);
    const usernameInputEl = useRef(null);
    const passwordInputEl = useRef(null);

    const onMsgResult = (res) => {
        if (res.success) setSuccess(res.success);
        if (res.error) setError(res.error);
    };
    const onFormInteract = (e) => {
        e.preventDefault();

        if (e.target.id == 'username') {
            // update background it looks cool i think
            setUsername(usernameInputEl.current.value);
        }
        // on enter key pressed any input inside the form
        if (e.keyCode == 13) sendAuthRequest(e);
    };
    const onTogglePrivacy = (e) => {
        setPrivacy(!privacy)
        passwordInputEl.current.setAttribute('type', privacy ? 'text' : 'password');
    };
    const sendAuthRequest = (e) => {
        e.preventDefault();

        setError(''); setSuccess('');
        const invalid = (s) => !s || s.indexOf(/[^a-zA-Z0-9-_]/g) >= 0
        const username = usernameInputEl.current.value;
        const password = passwordInputEl.current.value;

        if (invalid(username) || invalid(password)) {
            return setError('Please enter valid credentials.');
        }

        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/login`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                loginToken: nanoid(),
            })
        })
            .then(res => res.json())
            .then(res => {
                onMsgResult(res);
                if (!res) return;
                if (res.ID) {
                    document.cookie = User.generateCookie(res);
                    setInterval(() => {
                        window.location = '/profile';
                    }, 1200);
                }
            })
            .catch((e) => setError(`Failed to login: ${e}`));
    };

    return (
        <>
            <Alert type={'success'} className={'fixed top-24 md:right-6'} message={success} dismiss={(e) => setSuccess('')} />
            <Alert className={'fixed top-24 md:right-6'} message={error} dismiss={(e) => setError('')} />

            <div className="relative flex min-h-screen">
                <Navbar />


                <form onKeyUp={onFormInteract} onSubmit={sendAuthRequest} id="login" className="mx-auto container pt-4 relative overflow-hidden">
                    <p className="ml-5 text-9xl absolute text-white/10 font-mono -z-50">{username}<span className="animate-pulse">_</span></p>

                    <div className="min-h-screen flex flex-col justify-center items-center space-y-12">
                        <input ref={usernameInputEl} id="username" name="username" type="text" placeholder="username" autoFocus={true} className="spacious-input" />
                        <div className="flex items-center relative overflow-hidden">
                            <input ref={passwordInputEl} id="password" name="password" type="password" placeholder="password" className="spacious-input" />
                            <span onClick={onTogglePrivacy} className="p-6 absolute right-0 border-l border-white/10 hover:bg-white/10 rounded cursor-pointer">
                                {privacy ? <i className="fa-regular fa-eye-slash text-2xl w-8"></i> : <i className="fa-solid fa-eye text-2xl w-8"></i>}
                            </span>
                        </div>
                        <div className="flex flex-col text-center font-mono">
                            <button onClick={sendAuthRequest} className="text-3xl px-16 py-4 hover:button-skew hover:shadow" type="button">Login</button>
                            <Link href="/register">
                                <a className="my-2 hover:text-blue-500">register</a>
                            </Link>
                        </div>
                    </div>
                </form>
            </div >
        </>
    );
}

export async function getServerSideProps({ req, res }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } }

    if (req.cookies.user) return redirect('/profile');

    return {
        props: {}
    };
}