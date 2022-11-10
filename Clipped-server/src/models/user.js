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