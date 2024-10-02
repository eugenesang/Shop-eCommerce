const charList = `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&*@`;
const random = ()=> charList[parseInt(Math.random() * charList.length)];

let str = "";

while(str.length < 82){
    str+=random()
}

console.log(str);
