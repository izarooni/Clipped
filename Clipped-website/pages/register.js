import React, { useState, useRef } from 'react';
import { nanoid } from 'nanoid';

import Navbar from '/components/navbar';
import Alert from '/components/alert';

export default function Register({ menu, server }) {
    const [error, setError] = useState('');

    const [username, setUsername] = useState('');

    const visible = useRef(false);
    const [eyeball, setEyeball] = useState(<i className="fa-solid fa-eye text-3xl"></i>);

    const onInteract = (e) => {
        e.preventDefault();

        if (e.target.id == 'username') {
            setUsername(e.target.value);
        }
        if (e.keyCode == 13) {
            sendRegisterRequest(e);
        }
    };

    const sendRegisterRequest = (e) => {
        e.preventDefault();

        setError('');

        const invalid = (s) => !s || s == 0 || s.indexOf(/[^a-zA-Z0-9-_]/g) >= 0
        let username = document.querySelector('#username').value;
        let password = document.querySelector('#password').value;
        ;
        if (invalid(username) || invalid(password)) {
            return setError('Please enter valid credentials.');
        }

        const request = {
            username: username,
            password: password,
            loginToken: nanoid()
        };
        document.cookie = 'user=' + JSON.stringify(request);

        fetch(`${server}/register`, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            'headers': {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })
            .then(res => res.json())
            .then(res => {
                if (res.error) setError(res.error);
                else if (res.success) {
                    window.location = "/profile";
                }
            })
            .catch((e) => {
                console.error(e);
                setError('Failed to login.');
            })
    };

    const onClickEyeBall = (e) => {
        e.preventDefault();

        visible.current = !visible.current;
        document.querySelector('#password').setAttribute('type', visible.current ? 'text' : 'password');
        setEyeball(visible.current ?
            <i className="fa-solid fa-eye text-3xl"></i>
            :
            <i className="fa-regular fa-eye text-3xl"></i>
        );
    };

    return (
        <div className="flex h-full">
            <Navbar menu={menu} />

            <div className="relative w-full p-5">
                <p className="text-9xl absolute text-white/10 font-mono -z-50">{username}<span className="animate-pulse">_</span></p>

                <Alert className={'fixed right-6'} message={error} />

                <form onKeyUp={onInteract} onSubmit={sendRegisterRequest} id="login" className="h-full flex justify-center items-center">
                    <divc className="flex flex-col justify-center items-center space-y-12">
                        <input id="username" name="username" type="text" placeholder="username" />
                        <div className="flex items-center relative overflow-hidden">
                            <input id="password" name="password" type="password" placeholder="password" />
                            <button onClick={onClickEyeBall} type="button" className="p-6 absolute right-0 border-l border-white/10 hover:bg-white/10 rounded cursor-pointer">
                                {eyeball}
                            </button>
                        </div>
                        <div className="flex flex-col text-center font-mono">
                            <button onClick={sendRegisterRequest} className="text-3xl px-16 py-4 hover:button-skew hover:shadow" type="button">Register</button>
                        </div>
                    </divc>
                </form>
            </div>
        </div >
    );
}

export async function getServerSideProps() {
    return {
        props: {
            server: process.env.NEXT_PUBLIC_STREAM_SERVER,
        }
    };
}