export function fetchVideos(endPoint, callback, error, body) {
    fetch(endPoint, {
        method: 'POST',
        cache: 'no-cache',
        'headers': {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
    })
        .then(r => r.json())
        .then(callback)
        .catch(error);
}

export function fromArray(a) {
    return {
        ID:         /**/a[0] || null,
        ownerID:    /**/a[1] || null,
        displayName:/**/a[2] || null,
        fileName:   /**/a[3] || null,
        filePath:   /**/a[4] || null,
        createdAt:  /**/a[5] || null,
        updatedAt:  /**/a[6] || null,
        views:      /**/a[7] || 0,
        likes:      /**/a[8] || 0,
        dislikes:   /**/a[9] || 0,
        private:    /**/a[10] || 0,
        description:/**/a[11] || null,
    };
}

export function fromObject(a) {
    return {
        ID: a.ID || null,
        ownerID: a.ownerID || null,
        displayName: a.displayName || null,
        fileName: a.fileName || null,
        filePath: a.filePath || null,
        createdAt: a.createdAt || null,
        updatedAt: a.updatedAt || null,
        views: a.views || 0,
        likes: a.likes || 0,
        dislikes: a.dislikes || 0,
        private: a.private || 1,
        description: a.description || null,

        /**
         * custom value, not part of the main structure.
         * ownerUsername is used on video feeds where
         * only the avatar is shown.
         * 
         * this helps skip a process in the back-end to get the username,
         * instead it can be retrieved with the video via SQL join
         * 
         * we can't store the username with the video because the display name
         * is changeable at the user's discretion
         */
        ownerUsername: a.ownerUsername || null,
    };
}