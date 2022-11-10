export async function getUser(ID) {
    const f = await fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/profile/${ID}`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        'headers': {
            'Content-Type': 'application/json'
        }
    });
    return f.json();
}

export async function fromDatabase(a) {
    const f = await fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/login`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        'headers': {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(a)
    });
    return f.json();
}

export function fromCookie(a) {
    try {
        if (!a) return null;

        // cannot parse an object itself for god who knows why,
        //  so create a single-element array and retrieve immediately
        let local = JSON.parse(`[${a}]`)[0];
        return fromObject(local);
    } catch (e) {

        console.log(`[user.js] ${e}`, a);
        return null;
    }
}

export function fromArray(a) {
    return {
        ID:         /**/a[0],
        webAdmin:   /**/a[1],
        displayName:/**/a[2],
        username:   /**/a[3],
        password:   /**/a[4],
        loginToken: /**/a[5],
        createdAt:  /**/a[6],
        updatedAt:  /**/a[7],
        avatar:     /**/a[8],
    }
}

export function fromObject(object) {
    return {
        ID: object.ID || 0,
        webAdmin: object.webAdmin || 0,
        displayName: object.displayName || '',
        username: object.username || '',
        password: object.password || '',
        loginToken: object.loginToken || null,
        createdAt: object.createdAt || null,
        updatedAt: object.updatedAt || null,
        avatar: object.avatar || null,
    };
}