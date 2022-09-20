const {
  getAllUsers,
  lookUpUser,
  getRegions,
  getProvinces,
  getCities,
  insertUser,
  sendOTP,
  validateOTP,
  getBarangays,
  sampleInsert,
  createRoom,
  generateAccessToken,
  insertHosted,
  lookHost,
  isUniqueNameActive,
  insertDoctor,
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
  findPatientInfoById,
  putPatientInQueue,
  nextInQueue,
  getMDetails,
  findMeetingDetailsByHostID,
  getPrescription,
  getPromo,
  insertOrder,
  getOrder,
  getPromoDetails,
} = require("../model/model.js");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = process.env;

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (e) {
    return { message: "expired" };
  }
}

function createToken(username, usertype) {
  const token = jwt.sign(
    {
      owner: username,
      usertype: usertype,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 60,
    },
    JWT_SECRET
  );
  return token;
}

const getUsers = async function (req, res) {
  let a = await getAllUsers();
  res.send(a);
};

const loginUser = async function (req, res) {
  let { username, password } = req.body;
  let result = await lookUpUser(username, password);
  if (result.length) {
    const token = jwt.sign(
      {
        owner: result[0].username,
        id: result[0]._id,
        usertype: result[0].usertype,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 10,
      },
      JWT_SECRET
    );
    res.send({ statusCode: 200, token, message: "found" });
  } else res.send({ statusCode: 304, message: "no account" });
};

const getRegs = async function (req, res) {
  let result = await getRegions();
  res.send(result);
};

const getProvs = async function (req, res) {
  let result = await getProvinces(req.body.region_code);
  res.send(result);
};

const getCits = async function (req, res) {
  let result = await getCities(req.body.province_code);
  res.send(result);
};

const getBrgys = async function (req, res) {
  let result = await getBarangays(req.body.city_code);
  res.send(result);
};

const insertNewUser = async function (req, res) {
  let result = await insertUser({ activeness: "active", ...req.body });

  const token = jwt.sign(
    {
      owner: req.body.username,
      usertype: req.body.usertype,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    JWT_SECRET
  );

  res.send({ ...result, token });
};

const sOTP = async function (req, res) {
  let { phone_number } = req.body;
  let result = await sendOTP(phone_number);
  res.send(result);
};

const vOTP = async function (req, res) {
  let { OTP, PhoneNumber } = req.body;
  let result = await validateOTP({ OTP, PhoneNumber });
  res.send(result);
};

const sInsert = async function (req, res) {
  let result = await sampleInsert({ ...req.body });
  res.send({ message: "success" });
};

const jwtVerify = async function (req, res) {
  const token = verifyToken(req.body.token);
  if (token?.message) {
    res.send({ message: "expired" });
  } else res.send(token);
};

const cMeet = async function (req, res) {
  let room = await createRoom();
  res.send(room);
};

const gAccessKey = async function (req, res) {
  const { participantName, token, uniqueName } = req.body;
  console.log(req.body);
  let decoded = verifyToken(token);
  let ak = await generateAccessToken({
    participantName,
    roomName: uniqueName ? uniqueName : decoded.uniqueName,
  });
  console.log(ak);
  res.send(ak);
};

const iHost = async function (req, res) {
  const { title, description, startdate, enddate, starttime, endtime, token } =
    req.body;
  let decoded = verifyToken(token);

  let tres = await lookHost(decoded.id);

  if (decoded?.message) {
    res.send({ message: "expired" });
  } else {
    if (tres.length === 0) {
      let cursor = await insertHosted({
        owner: decoded.id,
        title,
        description,
        startdate,
        enddate,
        starttime,
        endtime,
      });
      res.send(cursor);
    } else res.send({ message: "already" });
  }
};

const hostLook = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  if (decoded?.message) {
    res.send({ message: "expired" });
  } else {
    let response = await lookHost(decoded.id);
    if (response.length) {
      res.send({
        owner: response[0].owner,
        activeness: response[0].activeness,
        uniqueName: response[0].uniqueName,
        message: "has",
      });
    } else res.send({ message: "none" });
  }
};

const doctorsInHost = async function (req, res) {
  let { uniqueName } = req.body;
  let result = await getDoctorsInHost(uniqueName);
  res.send(result);
};

const getPHost = async function (req, res, next) {
  let { token } = req.body;
  let decoded = verifyToken(token);
  if (decoded?.message) {
    res.send({ message: "expired" });
  } else {
    let response = await getPatientHost(decoded.id);

    if (response.length) {
      res.send({ info: response[0], message: "has" });
    } else res.send({ message: "none" });
  }
};

const iSocketID = async function ({ uniqueName, socketID, token }) {
  console.log(token);
  let decoded = verifyToken(token);
  if (decoded?.message) {
    console.log("expired");
  } else {
    let result = await insertSocketID(socketID, uniqueName, decoded.id);
    return result;
  }
};

const gPatientInAroom = async function (token) {
  let decoded = verifyToken(token);
  console.log(decoded);
  let a = await getPatientInAroom(decoded.uniqueName);
  return a;
};

const cancelPatient = async function (id) {
  let a = await cancelPatientInQueue(id);
  return a;
};

// const iPrescription = async function (req, res) {
//   let { owner, html } = req.body;
//   let response = await insertPrescription({ owner, html });
//   res.send(response);
// };

const getResidents = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  let response = await findData(decoded.id);
  res.send(response);
};

const gResidents = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  let response = await getSolelyResidents(decoded.id);
  res.send(response);
};

const gMedicines = async function (req, res) {
  let { id, type, token } = req.body;
  let decoded = verifyToken(token);
  let response = await getMedicines(id, type, decoded.id);
  res.send(response);
};

const gfMedicines = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  let response = await getFirstMedicines(decoded.id);
  res.send(response);
};

const iMedicine = async function (req, res) {
  let { token, name, type, quantity, measurement } = req.body;
  let decoded = verifyToken(token);
  let response = await insertMedicine({
    name,
    type,
    quantity,
    measurement,
    owner: decoded.id,
  });
  res.send(response);
};

const fMedicine = async function (req, res) {
  let { token, search } = req.body;
  let decoded = verifyToken(token);
  let response = await findMedicine({ owner: decoded.id, search });
  res.send(response);
};

const fUser = async function (token) {
  let decoded = verifyToken(token);
  let response = await findUser(decoded.id);
  return response;
};

const fPromo = async function (req, res) {
  let response = await findPromo(req.body.code);
  res.send(response);
};

const payment = async function (req, res) {
  let response = await createSource(parseInt(req.body.amount + "00"));
  res.send(response);
};

// NEW

const gMeetingDetails = async function (req, res) {
  let [meetingResponse, attendeeResponse] = await getMeetingDetails();
  res.send({
    meetingResponse,
    attendeeResponse,
  });
};

const eMeeting = async function (req, res) {
  let response = await endMeeting(req.body.MeetingId);
  res.send(response);
};

const iLGU = async function (req, res) {
  let response = await insertLGU({ ...req.body });
  res.send(response);
};
const iDrugstore = async function (req, res) {
  let response = await insertDrugstore({ ...req.body });
  res.send({
    ...response,
    token: createToken(req.body.username, req.body.usertype),
  });
};

const iPatient = async function (req, res) {
  let response = await insertPatient({ ...req.body });
  res.send({
    ...response,
    token: createToken(req.body.username, req.body.usertype),
  });
};

const logUser = async function (req, res) {
  let response = await login(req.body.username, req.body.password);
  console.log("sample", response);
  if (response.message === "found") {
    let token = jwt.sign(
      {
        owner: response.data.username,
        id: response.data.user_id,
        usertype: response.data.usertype,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 10,
      },
      JWT_SECRET
    );
    res.send({ message: "found", token });
  } else res.send({ message: "not found" });
};

const createHost = async function (req, res) {
  const {
    title,
    description,
    startdate: start_date,
    enddate: end_date,
    starttime: start_time,
    endtime: end_time,
    token,
  } = req.body;
  let decoded = verifyToken(token);

  if (decoded?.message) res.send({ message: "expired" });
  else {
    let response = await insertHost({
      user_id: decoded.id,
      title,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
    });
    if (response.message === "success") res.send({ message: "success" });
    else res.send({ message: "error" });
  }
};

const fHost = async function (req, res) {
  let decoded = verifyToken(req.body.token);

  let response = await findHost(decoded.id);
  res.send(response);
};

const iDoctor = async function (req, res) {
  let { fullname, extensions, hostId, specialty } = req.body;
  let response = await insertDoctor({
    fullname,
    extensions,
    hostId,
    specialty,
  });
  let token;
  if (response.message === "success") {
    token = jwt.sign(
      {
        id: response.doctor_id,
        usertype: "doctor",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 60,
      },
      JWT_SECRET
    );
    res.send({ message: "success", token });
  } else res.send(response);
};

const fPatientHost = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  console.log("asd", decoded);
  let response = await findPatientHost(decoded.id);
  res.send(response);
};

const pPatientInQueue = async function (req, res) {
  console.log(req.body);
  if (req.body.by) {
    const { token, queue_url, notes, socketID } = req.body;
    let decoded = verifyToken(token);
    let [user] = await findPatientInfoById(decoded.id);
    let response = await putPatientInQueue({
      queue_url,
      fullname: `${user.fname} ${user.mname} ${user.lname}`,
      age: new Date().getFullYear() - new Date(user.birthday).getFullYear(),
      sex: user.gender,
      notes,
      socketID,
    });
    res.send(response);
  } else {
    const { fullname, age, sex, notes, queue_url, socketID } = req.body;
    let response = await putPatientInQueue({
      queue_url,
      fullname,
      age,
      sex,
      notes,
      socketID,
    });
    res.send(response);
  }
};

const nInQueue = async function (queue_url) {
  let response = await nextInQueue(queue_url);
  return response;
};

const fMeetingDetails = async function (req, res) {
  let response = await findMeetingDetailsByHostID(req.body.hostID);
  res.send(response);
};

const iPrescription = async function (req, res) {
  let {
    token,
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
  } = req.body;
  let decoded = verifyToken(token);
  let response = await insertPrescription({
    doctor_id: decoded.id,
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
  });
  res.send(response);
};

const gPrescription = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  let info = await findPatientInfoById(decoded.id);
  let response = await getPrescription(decoded.id);
  res.send({ message: "success", data: response.data, user_info: info[0] });
};

const gPromo = async function (req, res) {
  let response = await getPromo(req.body.code);
  res.send(response);
};

const iOrder = async function (req, res) {
  let { data, user_id } = req.body;
  let response = await insertOrder({ data, user_id });
  res.send(response);
};

const gOrder = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  let response = await getOrder(decoded.id);
  res.send(response);
};

const iPromo = async function (req, res) {
  let { token, name, promo_code, start_date, end_date, type, value } = req.body;
  let decoded = verifyToken(token);
  let response = await insertPromo({
    name,
    promo_code,
    start_date,
    end_date,
    type,
    value,
    user_id: decoded.id,
  });
  res.send(response);
};

const gPromoDetails = async function (req, res) {
  let decoded = verifyToken(req.body.token);
  let response = await getPromoDetails(decoded.id);
  res.send(response);
};

module.exports = {
  getUsers,
  loginUser,
  getRegs,
  getProvs,
  getCits,
  insertNewUser,
  sOTP,
  vOTP,
  getBrgys,
  sInsert,
  jwtVerify,
  cMeet,
  gAccessKey,
  iHost,
  hostLook,
  doctorsInHost,
  iPromo,
  getPHost,
  iSocketID,
  gPatientInAroom,
  cancelPatient,
  iPrescription,
  getResidents,
  gResidents,
  gMedicines,
  gfMedicines,
  iMedicine,
  fMedicine,
  fUser,
  fPromo,
  payment,
  gMeetingDetails,
  eMeeting,
  iLGU,
  iDrugstore,
  iPatient,
  logUser,
  createHost,
  fHost,
  iDoctor,
  fPatientHost,
  pPatientInQueue,
  nInQueue,
  fMeetingDetails,
  verifyToken,
  iPrescription,
  gPrescription,
  gPromo,
  iOrder,
  gOrder,
  gPromoDetails,
  iPromo,
};
