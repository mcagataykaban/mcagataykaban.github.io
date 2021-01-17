var apiUrl = "https://borc.cagataykaban.com/";
var pathname = window.location.pathname;

// functions
function changeForm() {
  if (!$("#frmGiris").hasClass("d-none")) {
    $("#frmGiris").addClass("d-none");
    $("#frmKayit").removeClass("d-none");
  } else {
    $("#frmGiris").removeClass("d-none");
    $("#frmKayit").addClass("d-none");
  }
}

function getAccessToken() {
  var loginDataJson = sessionStorage["login"] || localStorage["login"];
  var loginData;
  try {
    loginData = JSON.parse(loginDataJson);
  } catch (error) {
    return null;
  }

  if (!loginData || !loginData.access_token) {
    return null;
  }

  return loginData.access_token;
}

function getAuthHeaders() {
  return { Authorization: "Bearer " + getAccessToken() };
}

function tarihBicimlendir(isoTarih) {
  if (!isoTarih) {
    return "";
  }
  var tarih = new Date(isoTarih);
  return tarih.toLocaleDateString();
}

function borcuTabloyaEkle(d) {
  $("#borclarTableBody").append(
    '<tr id="kaldir'+d.Id+'" class="' +
      (d.BorcluMuyum ? "taraf-alacakli" : "taraf-borclu") +
      '">' +
      "<td class='text-left pr-0'><a href='#' data-borc-sil-id='"+d.Id+"'><i class='fa fa-trash text-danger mr-3'></i></a>" +
      d.Taraf +
      "</td>" +
      '<td class="borc-miktar-sutun">' +
      d.BorcMiktar.toFixed(2) +
      "</td>" +
      "<td>" +
      tarihBicimlendir(d.SonOdemeTarihi) +
      "</td><td>" +
      borcKapandiSwitch(d.BorcKapandiMi, d.Id) +
      "</td>" + 
      "</tr>"
  );
}

function borcKapandiSwitch(borcKapandiMi, borcId) {
  return (
    '<div class="custom-control custom-switch">' +
    "<input " +
    (borcKapandiMi ? " checked" : "") +
    ' data-borc-switch-id="' +
    borcId +
    '" type="checkbox" class="custom-control-input" id="chkKapandi-' +
    borcId +
    '">' +
    '<label class="custom-control-label" for="chkKapandi-' +
    borcId +
    '"></label>' +
    "</div>"
  );
}

function girisKontrol() {
  if (pathname.endsWith("/giris.html")) return;

  var accessToken = getAccessToken();

  if (!accessToken) {
    window.location.href = "giris.html";
    return;
  }

  // token şu an elimizde ama geçerli mi?
  $.ajax({
    type: "get",
    headers: getAuthHeaders(),
    url: apiUrl + "api/Account/UserInfo",
    success: function (data) {
      $("#loginAd").text(data.Email);
      borclariListele();
      $(".gizle").removeClass("gizle");
    },
    error: function () {
      window.location.href = "giris.html";
    },
  });
}

function borclariListele() {
  $.ajax({
    type: "get",
    headers: getAuthHeaders(),
    url: apiUrl + "api/Borclar/Listele",
    success: function (data) {
      borclariTabloyaEkle(data);
    },
  });
}

function borclariTabloyaEkle(borclar) {
  borclar.forEach((d) => {
    $("#borclarTableBody").append(borcuTabloyaEkle(d));
  });
}

// events
$("#btnCikisYap").click(function (event) {
  event.preventDefault();
  localStorage.removeItem("login");
  sessionStorage.removeItem("login");
  window.location.href = "giris.html";
});

$("#frmKayit").submit(function (event) {
  event.preventDefault();
  var frmKayit = this;
  $.ajax({
    type: "post",
    url: apiUrl + "api/Account/Register",
    data: {
      email: $("#inputEmailUp").val(),
      password: $("#inputPasswordUp").val(),
      confirmpassword: $("#inputPasswordConfirm").val(),
    },
    success: function (data) {
      console.log(data);
      frmKayit.reset();
      $("#basari").text("Kayıt başarılı.Giriş yapabilirsiniz.").show();
      $(".switch-input").click();
    },
    error: function (xhr, status, error) {
      if (xhr.responseJSON.ModelState["model.ConfirmPassword"]) {
        $("#hataUp").text("Şifreler eşleşmiyor.").show();
      }
      else if (xhr.responseJSON.ModelState[""][1]) {
        $("#hataUp").text("Bu mail daha önce alınmış.").show();
      }
    },
  });
});

$("#frmGiris").submit(function (event) {
  var frmGiris = this;
  var hatirla = $("#rememberme").prop("checked"); // true | false
  event.preventDefault();

  $.ajax({
    type: "post",
    url: apiUrl + "Token",
    data: {
      grant_type: "password",
      username: $("#inputEmail").val(),
      password: $("#inputPassword").val(),
    },
    success: function (data) {
      frmGiris.reset();
      localStorage.removeItem("login");
      sessionStorage.removeItem("login");
      var storage = hatirla ? localStorage : sessionStorage;
      storage["login"] = JSON.stringify(data);

      $("#basari").text("Giriş başarılı. Anasayfaya yönlendiriliyor..").show();
      setTimeout(function () {
        location.href = "./";
      }, 1000);
    },
    error: function (xhr, status, error) {
      if (xhr.responseJSON.error == "invalid_grant") {
        $("#hata").text("Kullanıcı adı ya da parola yanlış!").show();
      }
    },
  });
});

$("#frmBorc").submit(function (e) {
  e.preventDefault();
  var frm = this;
  $.ajax({
    type: "post",
    url: apiUrl + "api/Borclar/Ekle",
    headers: getAuthHeaders(),
    data: $(frm).serialize(),
    success: function (data) {
      borcuTabloyaEkle(data);
    },
    error: function (xhr, status, error) {
    },
  });
});

$("#frmGiris").on("input", function () {
  $("#hata").hide();
});
$("#frmKayit").on("input", function () {
  $("#hataUp").hide();
});

$(document).ajaxStart(function () {
  $("#loading").removeClass("d-none");
});

$(document).ajaxStop(function () {
  $("#loading").addClass("d-none");
});
$("body").on("change", "[data-borc-switch-id]", function (e) {
  var borcId = $(this).data("borc-switch-id");
  var borcKapandiMi = $(this).prop("checked");
  $.ajax({
    type: "put",
    url: apiUrl + "api/Borclar/KapanmaDurumGuncelle/" + borcId,
    headers: getAuthHeaders(),
    data: { BorcId: borcId, BorcKapandiMi: borcKapandiMi },
    success: function (data) {
      toastr.success("Borç güncellendi.")
    },
    error: function (xhr, status, error) {
      toastr.error("Terslik var.")
    },
  });
});

$("body").on("click", "[data-borc-sil-id]", function (e) {
  var borcId = $(this).data("borc-sil-id");
  var cevap = confirm("Borcu silmek istediğinize emin misiniz?");
  if (!cevap) {
    return;
  }
  $.ajax({
    type: "delete",
    url: apiUrl + "api/Borclar/Sil/" + borcId,
    headers: getAuthHeaders(),
    success: function (data) {
      $("#kaldir"+borcId).remove()
      toastr.success(data)
    },
    error: function (xhr, status, error) {
      toastr.error("Terslik var")
    },
  });
});
girisKontrol();
