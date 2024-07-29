import * as BudgetController from '../../src/controllers/budget'
import { Request, Response } from 'express';


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

describe('createBudget', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should create budget and return 200', () => {
        let req = mockRequest({ name: 'Groceries', amount: '$100 weekly' });
        let res = mockResponse();
        
        const id = Math.floor(0.5 * 1000000)
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        BudgetController.createBudget(req, res);
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            data: {
                amount: "$100 weekly",
                id: id,
                name: "Groceries"
            }
        })
    })

    it('should not create budget and return 400 if no amount is specified in the request', () => {
        let req = mockRequest({ name: 'Groceries' });
        let res = mockResponse();

        BudgetController.createBudget(req, res);
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Budget data is not formatted correctly"
        })
    })
})