const express = require('express');
const app = express();

const QiwiBillPaymentsAPI = require('@qiwi/bill-payments-node-js-sdk');

var key_json  = require("./qiwi_keys.json");

const SECRET_KEY = key_json[0].SECRET_KEY 

const SEC_TOKEN = key_json[0].SEC_TOKEN 

console.log(SECRET_KEY)
console.log(SEC_TOKEN)


var orgs_json = key_json[0].orgs;
console.log(orgs_json['vera'])


const qiwiApi = new QiwiBillPaymentsAPI(SECRET_KEY)

const uuidv4 = require('uuid/v4');


function generateBillId() {
    return String(parseInt(uuidv4(),16)) //& (1<<32)-1);
}


function getISOTime() {
    const date =  new Date();

    timePlused = date.getTime() + (1*24*60*60*1000); //+1 day

    date.setTime(timePlused);

    return date.toISOString();
}


app.get('/new_bill', (req, res) => {
  const sum = Number(req.query.sum);
  const billId = generateBillId();

  const fields = {
    amount: sum,
    currency: 'RUB',
    comment: 'topup',
    expirationDateTime: getISOTime()
  };

  qiwiApi.createBill( billId, fields ).then( data => {
    //do with data
    res.send(data);
  });
});


app.get('/check_bill', (req, res) => {
  const billId = req.query.bill_id;

  qiwiApi.getBillInfo(billId).then( data => {
    //do with data
    res.send(data);
  });
});


app.get('/cancel_bill', (req, res) => {
  const billId = req.query.bill_id;

  qiwiApi.cancelBill(billId).then( data => {
    //do with data
    res.send(data);
  });
});

app.get('/detect_card', (req, res) => {
  const card_num = req.query.card_num;

  const url='https://qiwi.com/card/detect.action';
  
  var querystring = require('querystring');
  var request = require('request');

  var form = {
    cardNumber: card_num
  };

  var formData = querystring.stringify(form);
  var contentLength = formData.length;

  request({
    headers: {
      'Accept': "application/json",
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    uri: url,
    body: formData,
    method: 'POST'
  }, function (err_p, res_p, body) {
       res.send(body);
  });

});


app.get('/to_card', (req, res) => {
  const card_num = req.query.card_num;
  const sum = req.query.sum;
  const card_type = req.query.card_type;
//  console.log(card_num);
//  console.log(sum);
//  console.log(card_type);

  if (['1963','21013','22351','31652'].includes(card_type) ){
         //send payment to card
           const url_pay = 'https://edge.qiwi.com/sinap/api/v2/terms/'+card_type+'/payments';
          // console.log(url_pay);
           var payment_request = require('request');
           payment_request({
    		headers: {
      			'Accept': "application/json",
      			'Content-Type': 'application/json',
			'Authorization': 'Bearer '+SEC_TOKEN
    		},
    		uri: url_pay,
    		method: 'POST',
                json: {
			"id": generateBillId(),
        		"sum":{
          		  "amount":sum,
          		  "currency":"643"
        		},
        		"paymentMethod":{
          			"type":"Account",
          			"accountId":"643"
        		},
        		"fields": {
          			"account":card_num
        		}
                       }
  	   }, function (err_pay, res_pay, body) {
                res.send(body);
 	      });	

  } else { //card not supported
         res.send({"error": "only card issued by Russian banks are supported"});      
  }       
    

});

app.get('/to_org', (req, res) => {
  const sum = req.query.sum;
  const org  = req.query.org_name;

  if (['vera','rusfund'].includes(org) ){
         //send payment to org
           const url_pay = 'https://edge.qiwi.com/sinap/api/v2/terms/1717/payments';
           
    
         // console.log(url_pay);
           var payment_request = require('request');
           payment_request({
                headers: {
                        'Accept': "application/json",
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer '+SEC_TOKEN
                },
                uri: url_pay,
                method: 'POST',
                json: {
                       	"id": generateBillId(),
                        "sum":{
                          "amount":sum,
                          "currency":"643"
                        },
                        "paymentMethod":{
                                "type":"Account",
                                "accountId":"643"
                        },
                        "fields": orgs_json[org]
                       }
           }, function (err_pay, res_pay, body) {
                res.send(body);
              });

  } else { //card not supported
         res.send({"error": "currently this organization is unsupported"});
  }


});




// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = 1081;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
