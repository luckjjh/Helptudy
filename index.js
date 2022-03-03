const express = require("express");
const app = express();
const port = 80;
const MongoClient = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
app.set("view engine", "ejs");

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({ secret: "secretCode", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

const fs = require("fs");

const dbAddress =
  "mongodb+srv://admin:admin@cluster0.vm8hf.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
let db;
MongoClient.connect(dbAddress, function (err, client) {
  if (err) return console.log("err");
  db = client.db("myFirstDatabase");
  console.log("mongoDB connected");
});

app.use("/assets", express.static("./assets"));

//홈 화면
app.get("/", (req, res) => {
  db.collection("study")
    .find()
    .toArray(function (err, result) {
      console.log(result);

      res.render("index.ejs", { studyList: result });
    }); //모든데이터 가져와서 작성
});

app.get("/detail/:id", (req, res) => {
  db.collection("post").findOne({ _id: req.params.id }, function (err, result) {
    console.log(result);
    res.render("detail.ejs", { data: result });
    //자료형 변환 필요할수도 있음
  });
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/study", (req, res) => {
  db.collection("study")
    .find()
    .toArray(function (err, result) {
      console.log(result);

      res.render("study.ejs", { studyList: result });
    }); //모든데이터 가져와서 작성
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/registerStudy", isLogined, (req, res) => {
  res.render("registerStudy.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get("/fail", (req, res) => {
  res.render("fail.ejs");
});

app.get("/mypage", isLogined, (req, res) => {
  console.log(req.user.result); //유저 정보
  res.render("mypage.ejs", { userInfo: req.user.result });
});

app.post("/joinStudy", isLogined, (req, res) => {
  console.log(req.user.result._id);
  console.log(req.body.studyname);
  const inputStudy = req.body.studyname;
  db.collection("users").update(
    { _id: req.user.result._id },
    { $addToSet: { studyList: inputStudy } }
  );
  console.log(req.user.result.studyList);
});

function isLogined(res, req, next) {
  if (res.user) {
    next();
  } else {
    req.render("fail.ejs");
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (inputid, inputpw, done) {
      //console.log(입력한아이디, 입력한비번);
      db.collection("users").findOne({ id: inputid }, function (err, result) {
        if (err) return done(err);

        if (!result)
          return done(null, false, { message: "존재하지않는 아이디요" });
        if (inputpw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
); //사용자 아이디 비번 검증

passport.serializeUser(function (user, done) {
  done(null, user.id);
}); //유저 정보 세션으로

passport.deserializeUser(function (userid, done) {
  //db에서 user.id로 user search
  db.collection("users").findOne({ id: userid }, function (err, result) {
    done(null, { result });
  });
}); //세션 찾는 함수

app.post("/register", function (req, res) {
  db.collection("users").insertOne(
    {
      id: req.body.userid,
      pw: req.body.userpw,
      name: req.body.username,
      univ: req.body.useruniv,
      major: req.body.usermajor,
      interest: req.body.userinterest,
      studyList: [],
    },
    function (err, result) {
      res.redirect("/login");
    }
  );
});

app.post("/registerStudy", function (req, res) {
  db.collection("study").insertOne(
    {
      name: req.body.studyname,
      topic: req.body.studytopic,
      maxMember: req.body.studymaxmember,
      place: req.body.studyplace,
    },
    function (err, result) {
      res.redirect("/study");
    }
  );
});

app.get("/search", (res, req) => {
  console.log(res.query.value); //검색어
  db.collection("study")
    .find({ name: res.query.value })
    .toArray((err, result) => {
      console.log(result);
      req.render("study.ejs", { studyList: result });
      //여기다 동작 결과 넣기
    });
});

app.listen(port, () => console.log(`listening on port ${port}`));
