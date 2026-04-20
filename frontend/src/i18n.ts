import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

dayjs.locale("zh-cn");

i18n.use(initReactI18next).init({
  lng: "zh-CN",
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
  resources: {
    "zh-CN": {
      translation: {},
    },
  },
});

export default i18n;

