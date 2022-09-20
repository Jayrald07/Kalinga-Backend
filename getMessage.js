const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const sqs = new AWS.SQS({ apiVersion: "2012-11-05", region: "us-east-2" });

const { QUEUE_URL, HOST_ID } = process.env;

sqs.receiveMessage(
  {
    MaxNumberOfMessages: 10,
    QueueUrl: `${QUEUE_URL}/${HOST_ID}`,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 0,
    AttributeNames: ["SentTimestamp"],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ["All"],
  },
  (err, data) => {
    if (err) console.log(err);
    else {
      console.log("Message Received", data);
      if (data.Messages?.length) {
        console.log(
          data.Messages[0].Attributes,
          data.Messages[0].MessageAttributes
        );
        sqs.deleteMessage(
          {
            QueueUrl: `${QUEUE_URL}/${HOST_ID}`,
            ReceiptHandle: data.Messages[0].ReceiptHandle,
          },
          (err, data) => {
            if (err) console.log(err);
            else console.log("Message Deleted!");
          }
        );
      } else console.log("There's no in the queue");
    }
  }
);
