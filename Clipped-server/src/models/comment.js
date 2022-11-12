export function fromArray(a) {
    return {
        ID:              /**/a[0],
        videoID:         /**/a[1],
        parentCommentID: /**/a[2],
        ownerID:         /**/a[3],
        message:         /**/a[4],
        createdAt:       /**/a[5],
        updatedAt:       /**/a[6],
        likes:           /**/a[7],
        dislikes:        /**/a[8],
    }
}

export function fromObject(object) {
    return {
        ID: object.ID || 0,
        videoID: object.videoID || 0,
        parentCommentID: object.parentCommentID || 0,
        ownerID: object.ownerID || 0,
        message: object.message || '',
        createdAt: object.createdAt || null,
        updatedAt: object.updatedAt || null,
        likes: object.likes || 0,
        dislikes: object.dislikes || 0,
    };
}


