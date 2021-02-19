let Customer = require('../models/customer');
let Participant = require('../models/participant');
let webhook = require('../lib/webhook');

module.exports = function(router) {

    router.post('/import', function(req, res){
        console.log(req.body);
    })

    router.post('/customer/:referral_code/events', function(req, res){
        let referral_code = req.params.referral_code;
        let uniqueId = req.body.userId;
        let columnName = ['name', 'email'];
        let custData = req.body.customer;
        let metaObj = {};
        Participant.findOne('referral_code', referral_code, function (rows){
            if(rows.data){
                Customer.findOne('unique_id', uniqueId, async function(customer){
                    customer.set('name', custData.name);
                    customer.set('email', custData.email);
                    Object.keys(custData).forEach((key, index) => {
                        if (columnName.indexOf(key) < 0) {
                            metaObj = {key: custData[key]}
                        }
                    });
                    customer.set('metadata', metaObj);
                    let updateCustomer = await customer.update();
                    res.status(200).json({'message': 'Customer Successfully Updated'});
                    await webhook('updated_customer', updateCustomer);
                })
                //let newCustomer = new Customer({'name': custData.name, 'email': custData.email});
                
            } else {
                return res.status(400).json({'message': 'Referral code does not exist'});
            }
        });
    })

    require("./entity")(router, Customer, "customers");

    return router;
}