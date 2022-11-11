import React, { useState, useRef } from 'react'
import { nanoid } from 'nanoid'
import Link from 'next/link'
import Alert from '/components/alert'
import Navbar from '/components/navbar'

export default function Login() {
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const iUsername = useRef(null);
    const iPassword = useRef(null);
    const iBall/**/ = false;
    const [eyeball, setEyeball] = useState('fa-solid fa-eye text-3xl');

    /**
     * handle for when any input element is changed
     */
    const onInteract = (e) => {
        e.preventDefault();
        setError('');

        // on username input field changed
        if (e.target.id == 'username') {
            // update background it looks cool i think
            setUsername(iUsername.current.value);
        }
        // on enter key pressed any input inside the form
        if (e.keyCode == 13) sendAuthRequest(e);
    };

    const sendAuthRequest = (e) => {
        e.preventDefault();

        const invalid = (s) => !s || s.indexOf(/[^a-zA-Z0-9-_]/g) >= 0
        const username = iUsername.current.value;
        const password = iPassword.current.value;

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
                if (res.error) setError(`${res.error}`);
                else {
                    document.cookie = `user=${JSON.stringify(res)};path=/;Max-Age=86400000`;
                    window.location = '/profile';
                }
            })
            .catch((e) => {
                setError(e.ror);
            })
    };
    const onClickEyeBall = (e) => {
        e.preventDefault();

        iBall = !iBall;
        iPassword.current.setAttribute('type', iBall ? 'text' : 'password');
        setEyeball(iBall ? 'fa-solid fa-eye text-3xl' : 'fa-regular fa-eye text-3xl');
    };

    return (
        <div className="flex h-full">
            <Navbar />

            <div className="relative w-full p-5">
                <p className="text-9xl absolute text-white/10 font-mono -z-50">{username}<span className="animate-pulse">_</span></p>

                <Alert className={'fixed right-6'} message={error} dismiss={(e) => setError('')} />
                <form onKeyUp={onInteract} onSubmit={sendAuthRequest} id="login" className="h-full flex justify-center items-center">
                    <div className="flex flex-col justify-center items-center space-y-12">
                        <input ref={iUsername} id="username" name="username" type="text" placeholder="username" autoFocus="true" />
                        <div className="flex items-center relative overflow-hidden">
                            <input ref={iPassword} id="password" name="password" type="password" placeholder="password" />
                            <button onClick={onClickEyeBall} type="button" className="p-6 absolute right-0 border-l border-white/10 hover:bg-white/10 rounded cursor-pointer">
                                <i className={eyeball}></i>
                            </button>
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
        </div>
    );
}

export async function getServerSideProps({ req, res }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } }

    if (req.cookies.user) return redirect('/profile');

    return {
        props: {}
    };
}