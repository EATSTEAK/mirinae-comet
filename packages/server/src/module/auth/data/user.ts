import type {UserInfo} from "types";
import type {
    BatchWriteItemInput,
    ExpressionAttributeValueMap,
    GetItemInput,
    UpdateItemInput,
    WriteRequest
} from "aws-sdk/clients/dynamodb";
import dynamoDB, {TableName} from "../../../util/database";
import {ResponsibleError, UnauthorizedError} from "../../../util/error";

export const adminId = process.env.ADMIN_ID ?? '20211561';

export const getUserInfo = async function (id: string): Promise<UserInfo> {
    const req: GetItemInput = {
        TableName,
        Key: {
            id: {
                S: id
            }
        }
    };
    const res = await dynamoDB.getItem(req).promise();
    const ret: UserInfo = {
        id: id,
        name: res.Item.name?.S ?? "",
        group: res.Item.group?.S ?? "unregistered"
    };
    return ret;
};

const assertAdmin = async function (modId: string, token: string) {
    const authReq: GetItemInput = {
        TableName,
        Key: {
            id: {
                S: modId
            }
        }
    };
    const authRes = await dynamoDB.getItem(authReq).promise();
    if (
        authRes.Item.id.S !== modId ||
        authRes.Item.accessToken?.S !== token ||
        (authRes.Item.isAdmin?.BOOL !== true && modId !== adminId)
    ) {
        throw new UnauthorizedError('Unauthorized');
    }
};

export const updateUserInfo = async function (
    modId: string,
    token: string,
    info: { id: string; isAdmin?: boolean; department?: string }
): Promise<{ id: string; isAdmin?: boolean; department?: string }> {
    await assertAdmin(modId, token);
    const attributes: ExpressionAttributeValueMap = {};
    let updateExp = '';
    if (info.isAdmin !== undefined) {
        attributes[':isAdmin'] = { BOOL: info.isAdmin };
        updateExp = 'SET isAdmin = :isAdmin';
    }
    if (info.department) {
        attributes[':department'] = { S: info.department };
        updateExp += `${updateExp ? ',' : 'SET'} department = :department`;
    }
    const req: UpdateItemInput = {
        TableName,
        Key: {
            id: { S: info.id }
        },
        UpdateExpression: updateExp,
        ExpressionAttributeValues: attributes
    };
    await dynamoDB.updateItem(req).promise();
    const ret: { id: string; isAdmin?: boolean; department?: string } = { id: info.id };
    if (info.isAdmin !== undefined) ret.isAdmin = info.isAdmin;
    if (info.department) ret.department = info.department;
    return ret;
};

export const batchCreateUserInfo = async function (
    modId: string,
    token: string,
    infos: Array<{ id: string; department: string; isAdmin?: boolean }>
): Promise<Array<{ id: string; department: string; isAdmin?: boolean }>> {
    if (infos.length === 0) return infos;
    if (infos.length > 25) throw new ResponsibleError('Maximum amount of batch creation is 25');
    const authReq: GetItemInput = {
        TableName,
        Key: {
            id: {
                S: modId
            }
        }
    };
    const authRes = await dynamoDB.getItem(authReq).promise();
    if (authRes.Item.id.S !== modId || authRes.Item.accessToken?.S !== token) {
        throw new UnauthorizedError('Unauthorized');
    }
    const requests: WriteRequest[] = infos.map((v) => ({
        PutRequest: {
            Item: {
                id: { S: v.id },
                department: { S: v.department },
                isAdmin: { BOOL: v.isAdmin === undefined ? false : v.isAdmin }
            }
        }
    }));
    const req: BatchWriteItemInput = {
        RequestItems: {
            TableName: requests
        }
    };
    await dynamoDB.batchWriteItem(req).promise();
    return infos;
};