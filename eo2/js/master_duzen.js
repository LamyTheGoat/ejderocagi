/* Merkez Meydan düzeni (eski yol; hâlâ okunur).
   Yeni yol: sahne editöründeki "Dışa aktar" master.duzen.js dosyasını indirir; o dosya js/bolumler/ altına konur ve
   liste.js içinde bölüm dosyasından önce yazılır (docs/BOLUM_SOZLESMESI.md).
   null iken düzen js/bolumler/merkez-meydan.js içindeki nesneler tablosundan (master piksel ölçülerinden) hesaplanır. */
window.EO2 = window.EO2 || {}; EO2.masterDuzen = null;
