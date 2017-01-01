---
title: Levels of Abstraction in Django
tags:
  - open source
  - gatsby
  - typography.js
date: "2014-07-01T17:52:44.000Z"
draft: false
---

I’m currently building an forecasting tool using Django, which has led to some interesting explorations of the levels of abstractions Django uses.

The nice thing about Django is it provides multiple levels of abstraction, depending on level of complexity and need for performance.

You can filtering and fetch related objects natively in Django with less clunkiness that SQL WHERE and JOIN clauses. You can append SQL clauses to a Django query with raw() and extra(). Or you can just drop into straight SQL where necessary.

The programmer’s task, then, is to figure out which level of abstraction is appropriate, in order to use the right toolkit.

For each use case, we’ll ask, in essence, whether the screwdriver in our pocket is going to work — or whether we have to walk to our car and lug out the power drill.

Filtering & creating lists of models

I’m trying to do some forecasting and simulation for our ad campaigns (known as adgroups) based on format type (poll, video, etc). I need to make a list of all poll ad campaigns.

Each AdGroup can have multiple ‘promos’ attached to it, with specific code in the promomodule, which has a module type representing the format. The module types have names like Pollv1Module and Videov2Module.

I need to make a list of all the Poll modules. Django lets me do this at a quick pass:

```
AppDLAdGroups = AdGroup.objects.filter(promos__promomodule__module__startswith='Poll').values_list('id')
```

Nice. Let’s inspect the underlying SQL query using ```AppDLAdGroups.query.__str__()```:

```
SELECT adgroup_table.id from adgroup_table
LEFT JOIN promos_table as map ON map.adgroup_id = adgroup_table.id
LEFT JOIN promomodule_table AS promo ON promo.promo_id = map.promo_id
LEFT JOIN module_name_table as module_name on module_name.name = promo.module
WHERE module_name.name LIKE "Poll%"
```

At this level, the Django code is nicer so we’re going to stick to these.

### Aggregations

Let’s say I want to make a Reservation model to simulate the amount of impressions we have at a particular location at a particular day, as well as which AdGroups will be taking these impressions. I can enter in Reservations with positive numbers to represent capacity, and other Reservations with negative numbers to represent bookings, and run the following query:

 total_capacity_query = Reservation.objects.values('venue','date').annotate(sum_impressions=Sum('impressions'))
The basic syntax is to use .values() with the fields you’re pivoting by, and annotate(Sum()) with the fields you want to measure.

The corresponding SQL query:

```
SELECT venue_id, date, SUM(impressions) AS sum_impressions
FROM reservation_table
GROUP BY venue_id, date
```

Even though I’ll use the Django code, because it plays nicer with the rest of my codebase, I stylistically prefer the SQL query. The GROUP BY statement is more intuitive than values (not to mention values has different meanings when it is before and after an annotate!).

### Calculated Fields

Now, let’s say that Poll ads chew up more impressions than others, because people don’t like downloading apps onto to their devices. So we want to multiply all reservations associated with Poll by 2 to make our calculation.

There is no way to do this in one query in Django. You can do it in two separate queries, and combine them — but now we have to leave the database and write some hack to do the calculations in Python. Not great.

In SQL, it’s a pretty straightforward, so we can just drop down into raw():

```
SELECT venue_id, date,
  SUM(
    CASE
      WHEN adgroup_id in (
        SELECT adgroup_table.id from adgroup_table
        LEFT JOIN promos_table as map ON map.adgroup_id = adgroup_table.id
        LEFT JOIN promomodule_table AS promo ON promo.promo_id = map.promo_id
        LEFT JOIN module_name_table as module_name on module_name.name = promo.module
        WHERE module_name.name LIKE "Poll%"
      )
      THEN 2 * impressions
      ELSE impressions
    END
  ) AS sum_impressions
FROM reservation_table
GROUP BY venue_id, date;
```

### Bulk creation & deletion

Okay, now let’s write the code to create all of the reservations we’re referencing:

```
for venue in chosen_venues.all():
  daily_prediction = self.get_impressions(venue)
  for date in user_daterange_array:
    Reservation.objects.create(
      reservation_type = "capacity",
      adgroup = None,
      venue = venue,
      impressions = daily_prediction,
      date = date
    )
```

Except this code takes forever to run (about 1h on my machine). What happens is that Django needs to make 5 million INSERT queries in the database…call functions like pre_save() and save() millions of times….and constantly toggle between code and database.

Luckily, Django has a solution here, bulk_create, which finesses this boundary a bit more nicely:

```
for venue in chosen_venues.all():
  daily_prediction = self.get_impressions_sum(venue)
  for date in user_daterange_array:
    self.prediction_list.append(
      Reservation(
        reservation_type = "capacity",
        adgroup = None,
        venue = venue,
        sessions = daily_prediction,
        date = date
      )
    )
  if len(self.prediction_list) % 100000 == 0:
    DailyVenueReservation.objects.bulk_create(self.prediction_list)
    self.prediction_list = []
```

Why in batches of 100,000? If I don’t break it down, Django tries to load the whole 5 million element array into memory at the same time, which causes Linux to kill my Python process.

Anyway, this solution is much better (Runtime = 5m).

### Bulk deletion

Now, let’s say we want to delete the 5 million models we just made:

Reservation.objects.filter(reservation_type='capacity').delete()
What happens is that these object(s) are loaded into memory, and then a DELETE query is sent to the database. This is the same process whether there are 5 or, in this case 5 million objects. We get the same problem as earlier, when Django tries to load all of these objects into memory, and then Linux to kill the Python process.

We could use the same trick again, but there’s a better solution. We don’t *need* to load these models into memory, we just need to send a query to the database to delete all the corresponding rows! Your database doesn’t load your whole delete query into memory, it just deletes the matching rows one-by-one as it finds them, making this whole process much faster.

```
from django.db import connection

def delete_reservation_type(res_type):
  cursor = connection.cursor()
  delete_string = "DELETE FROM reservation_table where reservation_type = '%s'" % res_type
  cursor.execute(delete_string)
  cursor.close()

delete_reservation_type('capacity')
```

### Takeaways:

The Django ORM interface is nice and clean. Use it if you can.
When complexity increases, or performance matters, you’ll often need to drop into raw SQL. Don’t be afraid of this.
