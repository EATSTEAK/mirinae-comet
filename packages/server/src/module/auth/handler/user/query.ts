import type { APIGatewayProxyHandler } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../../../env';
import type { JwtPayload } from 'jsonwebtoken';
import { queryUser } from '../../data/user';
import { createResponse } from '../../../../common';
import { ResponsibleError } from '../../../../util/error';
import { assertAccessible } from '../../util/permission';

export const userQueryHandler: APIGatewayProxyHandler = async (event) => {
	const startsWith = event.queryStringParameters?.starts ?? '';
	const token = (event.headers.Authorization ?? '').replace('Bearer ', '');
	try {
		const id = (jwt.verify(token, JWT_SECRET) as JwtPayload).aud as string;
		await assertAccessible(id, token, 'executive');
		console.log(event);
		const result = await queryUser(startsWith);
		return createResponse(200, {
			success: true,
			result
		});
	} catch (e) {
		if (e instanceof ResponsibleError) {
			return e.response();
		}
		console.error(e);
		return createResponse(500, {
			success: false,
			error: 500,
			description: 'Internal Error'
		});
	}
};
