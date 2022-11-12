import React, { useState, useRef } from 'react';
import * as User from '/lib/models/user';
import Navbar from '/components/navbar';
import Alert from '/components/alert';

export default function Register() {
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [privacy, setPrivacy] = useState(true);

    const onMsgResult = (res) => {
        if (res.success) setSuccess(res.success);
        if (res.error) setError(res.error);
    };
    const onFormInteract = (e) => {
        e.preventDefault();

        if (e.target.id == 'username') {
            setUsername(e.target.value);
        }
        if (e.keyCode == 13) {
            sendRegisterRequest(e);
        }
    };
    const onTogglePrivacy = (e) => {
        setPrivacy(!privacy);
        document.querySelector('#password').setAttribute('type', privacy ? 'text' : 'password');
    };
    const sendRegisterRequest = (e) => {
        e.preventDefault();

        setError(''); setSuccess('');
        const invalid = (s) => !s || s == 0 || s.indexOf(/[^a-zA-Z0-9-_]/g) >= 0
        let username = document.querySelector('#username').value;
        let password = document.querySelector('#password').value;
        ;
        if (invalid(username) || invalid(password)) {
            return setError('Please enter valid credentials.');
        }

        const request = {
            username: username,
            password: password
        };

        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/register`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })
            .then(res => res.json())
            .then(res => {
                onMsgResult(res);
                if (res.success) {
                    document.cookie = User.generateCookie(User.fromObject(res.user));
                    setInterval(() => {
                        window.location = "/profile";
                    }, 1200);
                }
            })
            .catch((e) => {
                setError(`Registration failed: ${e.message}.`);
            });
    };

    return (
        <>
            <Alert type={'success'} className={'fixed top-24 right-6'} message={success} dismiss={(e) => setSuccess('')} />
            <Alert className={'fixed top-24 right-6'} message={error} dismiss={(e) => setError('')} />

            <div className="relative flex h-full truncate">
                <Navbar />

                <p className="m-5 text-9xl absolute text-white/10 font-mono -z-50">{username}<span className="animate-pulse">_</span></p>

                <form onKeyUp={onFormInteract} onSubmit={sendRegisterRequest} className="mx-auto">
                    <div className="min-h-screen flex flex-col justify-center items-center space-y-12">
                        <input id="username" name="username" type="text" placeholder="username" className="spacious-input" />

                        <div className="relative flex justify-center overflow-hidden">
                            <input id="password" name="password" type="password" placeholder="password" className="spacious-input" />
                            <span onClick={onTogglePrivacy} className="p-6 absolute right-0 border-l border-white/10 hover:bg-white/10 rounded cursor-pointer">
                                {privacy ? <i className="fa-regular fa-eye-slash text-2xl w-8"></i> : <i className="fa-solid fa-eye text-2xl w-8"></i>}
                            </span>
                        </div>

                        <div className="flex flex-col text-center font-mono">
                            <button onClick={sendRegisterRequest} className="text-3xl px-16 py-4 hover:button-skew hover:shadow" type="submit">Register</button>
                        </div>
                    </div>
                </form>
            </div >
        </>
    );
}