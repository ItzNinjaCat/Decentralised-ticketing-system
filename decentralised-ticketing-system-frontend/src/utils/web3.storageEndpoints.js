import { Web3Storage } from 'web3.storage';

const storage = new Web3Storage({ token: import.meta.env.VITE_WEB3_STORAGE_API_KEY });

// export const uploadMutableData = async files => {
//     const name = await Name.create();
//     const cid = await storage.put(files);
//     const revision = await Name.v0(name, cid);
//     await Name.publish(revision, name.key);
//     return name;
// };

// export const updateData = async (name, file) => {
//     const revision = await Name.resolve(name);
//     const cid = await storage.put([file]);
//     const nextRevision = await Name.increment(revision, cid);
//     await Name.publish(nextRevision, name.key);
//     return name;
// };

export const getData = async cid => {
    const files = await storage.get(cid);
    return files;
};

export const uploadImmutableData = async files => {
    const cid = await storage.put(files);
    return cid;
};
