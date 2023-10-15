document.addEventListener('DOMContentLoaded', function () {

    const searchBtn = document.querySelectorAll('.searchBtn');
    const searchBar = document.querySelector('.searchBar');
    const searchInput = document.getElementById('searchInput');
    const closeBtn = document.getElementById('searchClose');

    for (let i = 0; i < searchBtn.length; i++) {
        searchBtn[i].addEventListener('click', function () {
            searchBar.style.visibility = 'visible';
            searchBar.classList.add('open');
            this.setAttribute('aria-expended', 'true');
            searchInput.focus();
        })
    }

    closeBtn.addEventListener('click', function () {
        searchBar.style.visibility = 'hidden';
        searchBtn.classList.remove('open');
        this.setAttribute('aria-expended', 'false');
    })

})