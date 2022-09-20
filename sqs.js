const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const { QUEUE_URL } = process.env;

const sqs = new AWS.SQS({ apiVersion: "2012-11-05", region: "us-east-2" });

sqs.sendMessage(
  {
    DelaySeconds: 10,
    MessageAttributes: {
      Title: {
        DataType: "String",
        StringValue: "The Whistler",
      },
      Author: {
        DataType: "String",
        StringValue: "John Grisham",
      },
      WeeksOn: {
        DataType: "Number",
        StringValue: "6",
      },
    },
    MessageBody:
      "Information about current NY Times fiction bestseller for week of 12/11/2016.",
    QueueUrl: QUEUE_URL,
  },
  (err, data) => {
    if (err) console.log(err);
    else console.log(data);
  }
);
