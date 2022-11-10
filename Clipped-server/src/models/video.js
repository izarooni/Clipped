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
    };
}