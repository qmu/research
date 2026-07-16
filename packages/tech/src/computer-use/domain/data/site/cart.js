// Shared cart state for the fixture site. Backed by sessionStorage so it lives
// exactly as long as one browser session — every attempt therefore starts from a
// clean cart, which is what makes the "add two items" task reproducible.
//
// The cart is a SET of product ids (never a list with duplicates): adding the
// same product twice leaves one entry, so the two-items predicate can only pass
// when two DIFFERENT products were added. A duplicate-tolerant cart would let a
// double-click satisfy the task.
window.CART = (function () {
  var KEY = "qmu-cart";

  function read() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function write(ids) {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(ids));
    } catch (error) {
      /* storage unavailable: the cart stays empty and the task fails honestly */
    }
  }

  return {
    items: read,
    add: function (id) {
      var ids = read();
      if (ids.indexOf(id) === -1) {
        ids.push(id);
        write(ids);
      }
      return ids;
    },
    clear: function () {
      write([]);
    },
  };
})();
