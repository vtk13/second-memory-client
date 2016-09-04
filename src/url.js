export default {
    info,
    getItemUrl,
    setItemId
};

function info()
{
    var path = location.pathname.slice(1).split('/');
    var userId = Number.parseInt(path[0]);
    var itemId = path[1] ? Number.parseInt(path[1]) : 0;
    return [Number.isNaN(userId) ? 0 : userId, Number.isNaN(itemId) ? 0 : itemId];
}

function getItemUrl(itemId)
{
    var userId = location.pathname.split('/')[1];
    return '/' + userId + (itemId ? '/' + itemId : '');
}

function setItemId(itemId, hash)
{
    var [userId, oldItemId] = info();
    if (oldItemId != itemId) {
        window.history.pushState({}, '', getItemUrl(itemId) + (hash ? '#' + hash : ''));
    }
}
