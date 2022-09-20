const MongoDB = require("mongodb");
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const nanoid = require("nanoid");
const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const { v4: uuid } = require("uuid");
const mysql = require("mysql");

const {
  DB_RDS_HOST,
  DB_USERNAME,
  DB_NAME,
  DB_PASSWORD,
  SUCCESS_FALLBACK,
  FAILED_FALLBACK,
  QUEUE_URL,
  PAYMONGO_BASE64_AUTH,
} = process.env;

AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});
client.connect();
const sns = new AWS.SNS({ apiVersion: "2012-08-10" });
const chime = new AWS.Chime({ region: "us-east-1" });
chime.endpoint = new AWS.Endpoint("https://service.chime.aws.amazon.com");
const sqs = new AWS.SQS({ apiVersion: "2012-11-05", region: "us-east-2" });

const connection = mysql.createConnection({
  host: DB_RDS_HOST,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
});
connection.connect();

async function sendOTP(phone_number) {
  const OTP = nanoid.customAlphabet("1234567890", 5)();

  let query =
    "INSERT INTO tbl_otp(otp_id,code,phone_number,activeness) VALUES(?,?,?,?)";
  connection.query(query, [uuid(), OTP, phone_number, true]);

  var params = {
    PhoneNumber: "+63" + phone_number.substr(1),
    Message: "Kalinga OTP: " + OTP,
  };
  let a = await sns.publish(params).promise();
  return a;
}

async function validateOTP({ OTP, PhoneNumber }) {
  let query =
    "SELECT otp_id FROM tbl_otp WHERE code = ? AND phone_number = ? AND activeness = true";
  let a = await new Promise((resolve, reject) => {
    connection.query(query, [OTP, PhoneNumber], (err, res) => {
      if (err) reject(err);
      resolve({ message: "success" });
    });
  });

  if (a.message === "success") {
    query =
      "UPDATE tbl_otp SET activeness = false WHERE code = ? AND phone_number = ?";
    a = await new Promise((resolve, reject) => {
      connection.query(query, [OTP, PhoneNumber], (err, res) => {
        if (err) reject(err);
        resolve({ message: "success" });
      });
    });
    if (a.message === "success") return { message: "success" };
    else return { message: "error" };
  } else return { message: "error" };
}

async function getAllUsers() {
  const db = client.db("kalinga").collection("users");
  let a = await db.find();
  let b = await a.toArray();
  return b;
}

async function lookUpUser(username, password) {
  const db = client.db("kalinga").collection("users");

  let cursor = await db.find({
    username: { $eq: username },
    password: { $eq: password },
    activeness: { $eq: "active" },
  });

  let result = await cursor.toArray();
  return result;
}

async function getRegions() {
  let db = client.db("kalinga").collection("regions");
  let cursor = await db.find({}).project({ regCode: 1, regDesc: 1, _id: 0 });
  let result = await cursor.toArray();

  return result;
}

async function getProvinces(region_code) {
  let db = client.db("kalinga").collection("provinces");
  let cursor = await db
    .find({ regCode: { $eq: region_code } })
    .project({ provCode: 1, provDesc: 1, _id: 0 });
  let result = await cursor.toArray();

  return result;
}

async function getCities(province_code) {
  let db = client.db("kalinga").collection("cities");
  let cursor = await db
    .find({ provCode: { $eq: province_code } })
    .project({ citymunCode: 1, citymunDesc: 1, _id: 0 });
  let result = await cursor.toArray();

  return result;
}

async function getBarangays(city_code) {
  let db = client.db("kalinga").collection("barangays");
  let cursor = await db
    .find({ citymunCode: { $eq: city_code } })
    .project({ brgyCode: 1, brgyDesc: 1, _id: 0 });
  let result = await cursor.toArray();

  return result;
}

async function insertUser({ activeness, ...rest }) {
  const {
    fname,
    mname,
    lname,
    gender,
    birthday,
    phone,
    email,
    region,
    province,
    city,
    barangay,
    avenue,
    street,
    buildingNo,
    username,
    password,
    usertype,
  } = rest;
  console.log(rest);
  let response = await dbynamo
    .putItem({
      TableName: "users",
      Item: {
        user_id: {
          S: uuid(),
        },
        fname: { S: fname },
        mname: { S: mname },
        lname: { S: lname },
        gender: { S: gender },
        birthday: { S: birthday },
        phone: { S: String(phone).toString() },
        email: { S: email },
        region: { S: String(region).toString() },
        province: { S: String(province).toString() },
        city: { S: String(city).toString() },
        barangay: { S: barangay ? String(barangay).toString() : "-" },
        avenue: { S: avenue },
        street: { S: street },
        buildingNo: { S: buildingNo },
        username: { S: username ? username : "-" },
        password: { S: password ? password : "-" },
        activeness: { S: activeness },
        usertype: { S: usertype },
      },
    })
    .promise();

  return response;

  // let db = client.db("kalinga").collection("users");
  // let cursor = await db.insertOne({ activeness, ...rest });
  // return cursor.result;
}

async function createRoom() {
  let room = await Video.video.rooms.create();
  return room;
}

async function generateAccessToken({ participantName, roomName }) {
  const AT = Twilio.jwt.AccessToken;
  const token = new AT(
    process.env.SID,
    process.env.API_KEY,
    process.env.SECRET
  );
  token.identity = participantName;
  const videoGrant = new AT.VideoGrant({
    room: roomName,
  });

  token.addGrant(videoGrant);
  return { token: token.toJwt(), roomName };
}

async function insertHosted({
  owner,
  title,
  description,
  startdate,
  enddate,
  starttime,
  endtime,
}) {
  let response = await dbynamo
    .putItem({
      TableName: "meeting_host",
      Item: {
        host_id: {
          S: uuid(),
        },
        title: {
          S: title,
        },
        description: {
          S: description,
        },
        startdate: {
          S: startdate,
        },
        enddate: {
          S: enddate,
        },
        starttime: {
          S: starttime,
        },
        endtime: {
          S: endtime,
        },
        owner: {
          S: owner,
        },
      },
    })
    .promise();

  // let dbs = client.db("kalinga").collection("users");
  // let c = await dbs.findOne(MongoDB.ObjectId(owner));
  // let db = client.db("kalinga").collection("hosts");
  // let meeting = await createRoom();
  // let cursor = await db.insertOne({
  //   owner,
  //   title,
  //   description,
  //   startdate,
  //   enddate,
  //   starttime,
  //   endtime,
  //   activeness: "open",
  //   city: c.city,
  //   uniqueName: meeting.uniqueName,
  // });
  // return { ...cursor.result, uniqueName: meeting.uniqueName };
}

async function lookHost(id) {
  let response = await dbynamo
    .executeStatement({
      Statement: `
      SELECT *
      FROM meeting_host
      WHERE user_id = ? AND activeness = 'active'
    `,
      Parameters: [
        {
          S: id,
        },
      ],
    })
    .promise();

  let db = client.db("kalinga").collection("hosts");
  let cursor = await db.find({ owner: id, activeness: { $eq: "open" } });
  let res = await cursor.toArray();
  return res;
}

async function isUniqueNameActive(uniqueName) {
  let db = client.db("kalinga").collection("hosts");
  let cursor = await db.find({
    uniqueName: { $eq: uniqueName },
    activeness: "open",
  });
  let result = cursor.toArray();
  return result;
}

async function getDoctorsInHost(uniqueName) {
  let db = client.db("kalinga").collection("doctors");
  let cursor = await db.find({ uniqueName: { $eq: uniqueName } });
  let result = cursor.toArray();
  return result;
}

async function getPromos(owner) {
  let db = client.db("kalinga").collection("promos");
  let cursor = await db.find({ owner });
  let result = cursor.toArray();
  return result;
}

async function insertPromo({
  owner,
  name,
  code,
  description,
  startdate,
  enddate,
}) {
  let db = client.db("kalinga").collection("promos");
  let cursor = await db.insertOne({
    owner,
    name,
    code,
    description,
    startdate,
    enddate,
  });
  return { ...cursor.result, owner };
}

async function getPatientHost(id) {
  let citycode = null;
  let db = client.db("kalinga").collection("users");
  let cursor = await db.findOne(MongoDB.ObjectId(id));
  citycode = cursor.city;
  db = client.db("kalinga").collection("hosts");
  cursor = await db.find({ city: citycode, activeness: "open" });
  let result = cursor.toArray();
  return result;
}

async function insertSocketID(socketID, uniqueName, owner) {
  let db = client.db("kalinga").collection("sockets");
  let cursor = await db.insertOne({
    socketID,
    uniqueName,
    owner,
    activeness: true,
  });
  return { ...cursor.result, id: cursor.insertedId };
}

async function findUser(id) {
  let db = client.db("kalinga").collection("users");
  let cursor = await db.find(MongoDB.ObjectId(id));
  let result = await cursor.toArray();
  return result[0];
}

async function getPatientInAroom(uniqueName) {
  let db = client.db("kalinga").collection("sockets");
  let cursor = await db.find({ uniqueName, activeness: true }).sort({ _id: 1 });
  let result = await cursor.toArray();
  if (result.length) {
    let info = await findUser(result[0].owner);
    let { fname, mname, lname, gender, birthday } = info;
    return { ...result[0], fname, mname, lname, gender, birthday };
  } else return null;
}

async function cancelPatientInQueue(id) {
  let db = client.db("kalinga").collection("sockets");
  let cursor = await db.findOneAndUpdate(
    { _id: MongoDB.ObjectId(id) },
    { $set: { activeness: false } },
    { returnDocument: true }
  );
  console.log(cursor);
  return cursor;
}

async function insertPrescription({ owner, html }) {
  let db = client.db("kalinga").collection("prescriptions");
  let cursor = await db.insertOne({ owner, html });
  return cursor.result;
}

async function getCountGender(city, gender) {
  let db = client.db("kalinga").collection("users");
  let cursor = await db.find({ city, gender });
  let res = await cursor.toArray();
  return res.length;
}

async function findData(id) {
  let city;
  let db = client.db("kalinga").collection("users");
  let lgu = await db.find(MongoDB.ObjectId(id));
  let res = await lgu.toArray();
  city = parseInt(res[0].city);
  let data = {
    gender: [],
    count: 0,
  };
  let a = await getCountGender(city, "Male");
  let b = await getCountGender(city, "Female");
  let c = await getCountGender(city, "Lesbian");
  let d = await getCountGender(city, "Gay");
  let e = await getCountGender(city, "Bisexual");
  let f = await getCountGender(city, "Transgender");
  let g = await getCountGender(city, "Questioning");
  let h = await getCountGender(city, "Queer");
  let i = await getCountGender(city, "Intersex");
  let j = await getCountGender(city, "Pansexual");
  let k = await getCountGender(city, "Two-Spirit");
  let l = await getCountGender(city, "Androgunous");
  let m = await getCountGender(city, "Asexual");
  let count = await db.find({ city });
  let cursor = await count.toArray();
  data.count = cursor.length;
  data.gender.push(a);
  data.gender.push(b);
  data.gender.push(c);
  data.gender.push(d);
  data.gender.push(e);
  data.gender.push(f);
  data.gender.push(g);
  data.gender.push(h);
  data.gender.push(i);
  data.gender.push(j);
  data.gender.push(k);
  data.gender.push(l);
  data.gender.push(m);
  return data;
}

async function getSolelyResidents(id) {
  let city;
  let db = client.db("kalinga").collection("users");
  let cursor = await db.find(MongoDB.ObjectId(id));
  let res = await cursor.toArray();
  city = parseInt(res[0].city);

  cursor = await db.find({ city });
  res = await cursor.toArray();
  return { count: res.length };
}

async function getFirstMedicines(owner) {
  let db = client.db("kalinga").collection("medicines");
  let cursor = await db.find({ owner }).sort({ _id: 1 }).limit(10);
  let result = await cursor.toArray();
  return result;
}

async function getMedicines(id, type, owner) {
  let db = client.db("kalinga").collection("medicines");
  let cursor = await db
    .find(
      type === "next"
        ? { _id: { $gt: MongoDB.ObjectId(id) }, owner }
        : { _id: { $lt: MongoDB.ObjectId(id) }, owner }
    )
    .sort({ _id: type === "next" ? 1 : -1 })
    .limit(10);
  let res = await cursor.toArray();
  return res;
}

async function insertMedicine({ name, type, quantity, measurement, owner }) {
  let db = client.db("kalinga").collection("medicines");
  let cursor = await db.insertOne({ name, type, quantity, measurement, owner });
  return cursor.result;
}

async function findMedicine({ owner, search }) {
  let db = client.db("kalinga").collection("medicines");
  let cursor;
  if (search.trim())
    cursor = await db
      .find({ owner, name: { $regex: search, $options: "i" } })
      .limit(10);
  else cursor = await db.find({ owner }).sort({ _id: 1 }).limit(10);

  let result = await cursor.toArray();
  return result;
}

async function findUser(id) {
  let db = client.db("kalinga").collection("users");
  let cursor = await db.find(MongoDB.ObjectId(id));
  let result = await cursor.toArray();
  return result;
}

async function findPromo(code) {
  let db = client.db("kalinga").collection("promos");
  let cursor = await db.find({ code });
  let res = await cursor.toArray();
  return res;
}

async function createSource(amount) {
  const url = "https://api.paymongo.com/v1/sources";
  const options = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${PAYMONGO_BASE64_AUTH}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount,
          type: "gcash",
          currency: "PHP",
          redirect: {
            success: SUCCESS_FALLBACK,
            failed: FAILED_FALLBACK,
          },
          type: "gcash",
          currency: "PHP",
        },
      },
    }),
  };

  let response = await fetch(url, options);
  let result = await response.json();
  return result;
}

// NEW

async function getMeetingDetails() {
  const meetingResponse = await chime
    .createMeeting({
      ClientRequestToken: uuid(),
      MediaRegion: "us-east-2",
    })
    .promise();

  const attendeeResponse = await chime
    .createAttendee({
      MeetingId: meetingResponse.Meeting.MeetingId,
      ExternalUserId: uuid(),
    })
    .promise();
  console.log([meetingResponse, attendeeResponse]);
  return [meetingResponse, attendeeResponse];
}

async function endMeeting(MeetingId) {
  let response = await chime.deleteMeeting({ MeetingId }).promise();
  return response;
}

async function insertLGU({
  type,
  name,
  buildingNo,
  phone,
  avenue,
  street,
  email,
  region,
  province,
  city,
  usertype,
  activeness,
}) {
  try {
    let query =
      "INSERT INTO tbl_users(user_id,type,name,building_no,phone,avenue,street,email,region,province,city,usertype,activeness) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ";

    connection.query(query, [
      uuid(),
      type,
      name,
      buildingNo,
      phone,
      avenue,
      street,
      email,
      region,
      province,
      city,
      usertype,
      activeness,
    ]);
    return { message: "success" };
  } catch (e) {
    return { message: "error" };
  }
}

async function insertDrugstore({
  usertype,
  activeness,
  drugstoreName,
  branch,
  phone,
  email,
  region,
  province,
  city,
  barangay,
  avenue,
  street,
  buildingNo,
  username,
  password,
}) {
  try {
    let query =
      "INSERT INTO tbl_users(user_id,usertype,activeness,drugstore_name,branch,phone,email,region,province,city,barangay,avenue,street,building_no,username,password) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    connection.query(query, [
      uuid(),
      usertype,
      activeness,
      drugstoreName,
      branch,
      phone,
      email,
      region,
      province,
      city,
      barangay,
      avenue,
      street,
      buildingNo,
      username,
      password,
    ]);
    return { message: "success" };
  } catch (e) {
    return { message: "error insert" };
  }
}

async function insertPatient({
  usertype,
  activeness,
  fname,
  mname,
  lname,
  gender,
  birthday,
  phone,
  email,
  region,
  province,
  city,
  barangay,
  avenue,
  street,
  buildingNo,
  username,
  password,
}) {
  try {
    let query =
      "INSERT INTO tbl_users(user_id,usertype,activeness,fname,mname,lname,gender,birthday,phone,email,region,province,city,barangay,avenue,street,building_no,username,password) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    connection.query(query, [
      uuid(),
      usertype,
      activeness,
      fname,
      mname,
      lname,
      gender,
      birthday,
      phone,
      email,
      region,
      province,
      city,
      barangay,
      avenue,
      street,
      buildingNo,
      username,
      password,
    ]);
    return { message: "success" };
  } catch (e) {
    return { message: "error insert" };
  }
}

async function login(username, password) {
  try {
    let query =
      "SELECT username,usertype,user_id FROM tbl_users WHERE username = ? AND password = ?";
    let a = await new Promise((resolve, reject) => {
      connection.query(query, [username, password], (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });
    if (a.length) return { message: "found", data: a[0] };
    else return { message: "not found" };
  } catch (e) {
    console.log(e);
    return { message: "error finding" };
  }
}

async function insertHost({
  user_id,
  title,
  description,
  start_date,
  end_date,
  start_time,
  end_time,
}) {
  try {
    let query =
      "INSERT INTO tbl_hosts(user_id,host_id,meeting_details_id,title,description,start_date,end_date,start_time,end_time,activeness,queue_url) VALUES(?,?,?,?,?,?,?,?,?,?,?)";
    let host_id = uuid();
    let meeting_details_id = uuid();

    let queue = await sqs
      .createQueue({
        QueueName: host_id,
      })
      .promise();

    connection.query(query, [
      user_id,
      host_id,
      meeting_details_id,
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      true,
      queue.QueueUrl,
    ]);

    query = "INSERT INTO tbl_meeting_details VALUES(?,?,?,?,?,?,?,?,?,?)";

    const meetingResponse = await chime
      .createMeeting({
        ClientRequestToken: uuid(),
        MediaRegion: "us-east-2",
      })
      .promise();

    let {
      AudioFallbackUrl,
      AudioHostUrl,
      EventIngestionUrl,
      ScreenDataUrl,
      ScreenSharingUrl,
      ScreenViewingUrl,
      SignalingUrl,
      TurnControlUrl,
    } = meetingResponse.Meeting.MediaPlacement;

    connection.query(query, [
      meeting_details_id,
      meetingResponse.Meeting.MeetingId,
      AudioFallbackUrl,
      AudioHostUrl,
      EventIngestionUrl,
      ScreenDataUrl,
      ScreenSharingUrl,
      ScreenViewingUrl,
      SignalingUrl,
      TurnControlUrl,
    ]);

    return { message: "success" };
  } catch (e) {
    return { message: "error" };
  }
}

async function findHost(user_id) {
  try {
    let query =
      "SELECT host_id FROM tbl_hosts WHERE user_id = ? AND activeness = true";
    let a = await new Promise((resolve, reject) => {
      connection.query(query, [user_id], (err, res) => {
        if (err) reject(err);
        resolve(res);
      });
    });

    return { message: "success", data: a };
  } catch (e) {
    console.log(e);
    return { message: "error", data: null };
  }
}

async function insertDoctor({ hostId, fullname, extensions, specialty }) {
  try {
    let query = "INSERT INTO tbl_doctors VALUES(?,?,?,?,?)",
      doctor_id = uuid();
    connection.query(query, [
      doctor_id,
      hostId,
      fullname,
      extensions,
      specialty,
    ]);
    return { message: "success", doctor_id };
  } catch (e) {
    return { message: "error" };
  }
}

async function findPatientHost(user_id) {
  console.log(user_id);
  let query = `
      SELECT 
        *
    FROM
        tbl_hosts
    WHERE
        user_id = (SELECT 
                user_id
            FROM
                tbl_users
            WHERE
                city = (SELECT 
                        city
                    FROM
                        tbl_users
                    WHERE
                        user_id = ?)
                    AND user_id <> ?)
            AND activeness = TRUE
  `;

  let response = await new Promise((resolve, reject) => {
    connection.query(query, [user_id, user_id], (err, res) => {
      if (err) reject(err);
      resolve({ message: "success", data: res });
    });
  });

  return response;
}

async function putPatientInQueue({
  queue_url,
  fullname,
  age,
  sex,
  notes,
  socketID,
}) {
  console.log(queue_url, fullname, age, sex, notes);
  let response = await sqs
    .sendMessage({
      DelaySeconds: 10,
      MessageAttributes: {
        FullName: {
          DataType: "String",
          StringValue: fullname,
        },
        Age: {
          DataType: "Number",
          StringValue: age.toString(),
        },
        Sex: {
          DataType: "String",
          StringValue: sex,
        },
        socketID: {
          DataType: "String",
          StringValue: socketID,
        },
      },
      MessageBody: JSON.stringify({ notes }),
      QueueUrl: queue_url,
    })
    .promise();
  return response;
}

async function findPatientInfoById(user_id) {
  let query =
    "SELECT fname, mname,lname,gender,birthday, street,avenue,barangay,city,province,region FROM tbl_users WHERE user_id = ?";
  let response = await new Promise((resolve, reject) => {
    connection.query(query, [user_id], (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
  return response;
}

async function nextInQueue(hostID) {
  let response = await sqs
    .receiveMessage({
      MaxNumberOfMessages: 10,
      QueueUrl: `${QUEUE_URL}/${hostID}`,
      VisibilityTimeout: 20,
      WaitTimeSeconds: 0,
      AttributeNames: ["SentTimestamp"],
      MaxNumberOfMessages: 10,
      MessageAttributeNames: ["All"],
    })
    .promise();
  return response;
}

async function getMDetails(meeting_details_id) {
  let query = "SELECT * FROM tbl_meeting_details WHERE meeting_details_id = ?";
  let response = await new Promise((resolve, reject) => {
    connection.query(query, [meeting_details_id], (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });

  return response;
}

async function findMeetingDetailsByHostID(host_id) {
  let query = `
  SELECT 
    tbl_meeting_details.*
FROM
    tbl_meeting_details,
    tbl_hosts
WHERE
    tbl_hosts.host_id = ?
        AND tbl_meeting_details.meeting_details_id = tbl_hosts.meeting_details_id
  `;
  let response = await new Promise((resolve, reject) => {
    connection.query(query, [host_id], (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });

  const attendeeResponse = await chime
    .createAttendee({
      MeetingId: response[0].meeting_id,
      ExternalUserId: uuid(),
    })
    .promise();

  let a = {
    MeetingId: response[0].meeting_id,
    ExternalMeetingId: null,
    MediaPlacement: {
      AudioHostUrl: response[0].audio_host_url,
      AudioFallbackUrl: response[0].audio_fallback_url,
      ScreenDataUrl: response[0].screen_data_url,
      ScreenSharingUrl: response[0].screen_sharing_url,
      ScreenViewingUrl: response[0].screen_viewing_url,
      SignalingUrl: response[0].signaling_url,
      TurnControlUrl: response[0].turn_control_url,
      EventIngestionUrl: response[0].event_ingestion_url,
    },
    MediaRegion: "us-east-2",
    Attendee: {
      ExternalUserId: attendeeResponse.Attendee.ExternalUserId,
      AttendeeId: attendeeResponse.Attendee.AttendeeId,
      JoinToken: attendeeResponse.Attendee.JoinToken,
    },
  };

  return a;
}

async function insertPrescription({
  doctor_id,
  user_id,
  generic_name,
  brand_name,
  dose,
  dosage_form,
  dispensing_instruction,
  signatura,
  refill,
  diagnosis,
  remarks,
}) {
  let query = "INSERT INTO tbl_patient_prescriptions VALUES(?,?,?,?,?,?,?)";
  let patient_prescription_id = uuid();
  connection.query(query, [
    uuid(),
    user_id,
    patient_prescription_id,
    doctor_id,
    diagnosis,
    remarks,
    new Date(),
  ]);
  query = "INSERT INTO tbl_prescriptions VALUES(?,?,?,?,?,?,?,?,?)";
  connection.query(query, [
    uuid(),
    patient_prescription_id,
    generic_name,
    brand_name,
    dose,
    dosage_form,
    dispensing_instruction,
    signatura,
    refill,
  ]);
  return { message: "success" };
}

async function getPrescription(user_id) {
  let query = `
  select tbl_prescriptions.*,tbl_patient_prescriptions.date_created, tbl_patient_prescriptions.diagnosis, tbl_patient_prescriptions.remarks, tbl_doctors.fullname, tbl_doctors.extensions, tbl_doctors.specialty, tbl_users.region, tbl_users.province, tbl_users.city, tbl_users.avenue, tbl_users.street, tbl_users.phone
from tbl_patient_prescriptions, tbl_prescriptions, tbl_doctors, tbl_hosts, tbl_users
where tbl_patient_prescriptions.user_id = ?
AND tbl_prescriptions.patient_prescription_id = tbl_patient_prescriptions.patient_prescription_id
AND tbl_doctors.doctor_id = tbl_patient_prescriptions.doctor_id
AND tbl_hosts.host_id = tbl_doctors.host_id
AND tbl_users.user_id = tbl_hosts.user_id
  `;
  let response = await new Promise((resolve, reject) => {
    connection.query(query, [user_id], (err, data) => {
      if (err) reject(err);
      resolve({ message: "success", data });
    });
  });
  return response;
}

async function getPromo(code) {
  let query = "SELECT * from tbl_promos WHERE promo_code = ?";
  let res = await new Promise((resolve, reject) => {
    connection.query(query, [code], (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
  return { message: "succes", data: res };
}

async function insertOrder({ data, user_id }) {
  let query = "INSERT INTO tbl_orders values(?,?,?)";
  connection.query(query, [uuid(), user_id, data]);
  return { message: "success" };
}

async function getOrder(user_id) {
  let query = "SELECT * FROM tbl_orders WHERE user_id = ?";
  let res = await new Promise((resolve, reject) => {
    connection.query(query, [user_id], (err, data) => {
      if (err) reject(err);
      resolve({ message: "success", data: data[0] });
    });
  });
  return res;
}

async function insertPromo({
  user_id,
  name,
  promo_code,
  start_date,
  end_date,
  type,
  value,
}) {
  let query = "INSERT INTO tbl_promos values(?,?,?,?,?,?,?,?)";
  connection.query(query, [
    uuid(),
    user_id,
    promo_code,
    name,
    start_date,
    end_date,
    type,
    value,
  ]);
  return { message: "success" };
}

async function getPromoDetails(user_id) {
  let query = "SELECT * FROM tbl_promos WHERE user_id = ?";
  let res = await new Promise((resolve, reject) => {
    connection.query(query, [user_id], (err, data) => {
      if (err) reject(err);
      resolve({ message: "success", data: data });
    });
  });
  return res;
}

module.exports = {
  getAllUsers,
  lookUpUser,
  getRegions,
  getProvinces,
  getCities,
  insertUser,
  sendOTP,
  validateOTP,
  getBarangays,
  createRoom,
  generateAccessToken,
  insertHosted,
  lookHost,
  insertDoctor,
  isUniqueNameActive,
  getDoctorsInHost,
  getPromos,
  insertPromo,
  getPatientHost,
  insertSocketID,
  getPatientInAroom,
  cancelPatientInQueue,
  insertPrescription,
  findData,
  getSolelyResidents,
  getMedicines,
  getFirstMedicines,
  insertMedicine,
  findMedicine,
  findUser,
  findPromo,
  createSource,
  getMeetingDetails,
  endMeeting,
  insertLGU,
  insertDrugstore,
  insertPatient,
  login,
  insertHost,
  findHost,
  findPatientHost,
  putPatientInQueue,
  findPatientInfoById,
  nextInQueue,
  getMDetails,
  findMeetingDetailsByHostID,
  insertPrescription,
  getPrescription,
  getPromo,
  insertOrder,
  getOrder,
  insertPromo,
  getPromoDetails,
};
