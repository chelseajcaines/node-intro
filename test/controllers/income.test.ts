import * as incomeController from '../../src/controllers/income'
import { Request, Response } from 'express';

let mockQuery = jest.fn();

const mockRequest = (body: any) => {
    return {
        body: body,
    } as unknown as Request;
};

const mockResponse = () => {
    let res = {
        status: jest.fn(),
        json: jest.fn()
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res as unknown as Response;
};

describe('createIncome', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.mock('../../src/db', () => ({
            query: mockQuery,
        }));
    })

    it('should create income and return 200', () => {
        let req = mockRequest({ source: 'Full-time', amount: 1400 });
        let res = mockResponse();

        mockQuery.mockReturnValue([{source:'Freelancing', amount: 500}])
        
        // const id = Math.floor(0.5 * 1000000)
        // jest.spyOn(Math, 'random').mockReturnValue(0.5);

        incomeController.createIncome(req, res);
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                source: 'Freelancing',
                amount: 500
            }
        })
    })

    // it('should not create income and return 400 if no email is specified in the request', () => {
    //     let req = mockRequest({ name: 'John Doe' });
    //     let res = mockResponse();

    //     incomeController.createIncome(req, res);
    //     expect(res.status).toHaveBeenCalledWith(400)
    //     expect(res.json).toHaveBeenCalledWith({
    //         status: "error",
    //         message: "income data is not formatted correctly"
    //     })
    // })
})