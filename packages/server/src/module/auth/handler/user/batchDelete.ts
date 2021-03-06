import type { APIGatewayProxyHandler } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../../../env';
import type { JwtPayload } from 'jsonwebtoken';
import { createResponse } from '../../../../common';
import { ResponsibleError } from '../../../../util/error';
import { assertAccessible } from '../../util/permission';
import { batchDeleteUser } from '../../data/user';

export const userBatchDeleteHandler: APIGatewayProxyHandler = async (event) => {
	const token = (event.headers.Authorization ?? '').replace('Bearer ', '');
	let data: string[];
	try {
		data = JSON.parse(event.body) as string[];
	} catch {
		return createResponse(500, {
			success: false,
			error: 500,
			error_description: 'Data body is malformed JSON'
		});
	}
	if (!data || !Array.isArray(data)) {
		return createResponse(500, {
			success: false,
			error: 500,
			error_description: 'Internal error'
		});
	}
	let payload: JwtPayload;
	try {
		payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
	} catch {
		console.debug('malformed token');
		return createResponse(401, {
			success: false,
			error: 401,
			error_description: 'Unauthorized'
		});
	}
	let i = 0;
	try {
		const id = payload.aud as string;
		await assertAccessible(id, token, 'admin');
		for (i = 0; i < data.length; i += 25) {
			const partialData = data.slice(i, i + 25);
			await batchDeleteUser(partialData);
		}
		return createResponse(200, { success: true });
	} catch (e) {
		if (e instanceof ResponsibleError) {
			e.additionalInfo.failed_data = data.slice(i, data.length);
			return e.response();
		}
		console.error(e);
		const res = {
			success: false,
			error: 500,
			error_description: 'Internal error',
			failed_data: JSON.stringify(data.slice(i, data.length))
		};
		return createResponse(500, res);
	}
};
