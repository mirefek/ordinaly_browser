function saveLevel(level) {
    const cookieStr = "level="+level+"; SameSite=Strict; expires=Fri, 31 Dec 9999 23:59:59 GMT"
    // console.log(cookieStr)
    document.cookie = cookieStr
}

function loadLevel() {
    const levelStr = document.cookie
	  .split("; ")
	  .find((row) => row.startsWith("level="))
    ?.split("=")[1]
    const level = parseInt(levelStr)
    if (Number.isNaN(level)) return 0
    else return level
}
