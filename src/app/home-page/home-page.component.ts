import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { TokenStorageService } from '../_services/token-storage.service';
import { TaskService } from '../_services/task.service';
import { Task } from '../model/Task';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { SignalRService } from '../_services/signal-r.service';

declare var $: any;
@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {
  proxy: any;
  constructor(private tokenStorage: TokenStorageService, private _ngZone: NgZone, private signalR: SignalRService, private changeDetection: ChangeDetectorRef, private router: Router, private location: Location, private taskService: TaskService, private snackBar: MatSnackBar) {

    this.proxy = this.signalR.getProxy();
    this.proxy.on('sendNotification', (serverMessage) => {
      this.getUserTasks();
      this.getCompletedTasks();
      this.getFavoriteTasks();
    });

    if (this.tokenStorage.getToken()) {
      this.isLoggedIn = true;
      this.username = this.tokenStorage.getUser().userName;
    }
    if (!this.isLoggedIn) {
      this.location.replaceState('/');
      this.router.navigate(['login']);
    }
  }
  mode = new FormControl('over');

  task: Task = new Task("", "", null, 0);
  isLoggedIn = false;
  isLoginFailed = false;
  isChecked = false;
  username;

  allTasks: Array<any> = [];
  overdueTasks: Array<any> = [];
  completedTasks: Array<any> = [];
  favoriteTasks: Array<any> = [];
  interval: any;
  intervalOverdue: any;

  connection: any;

  isFavoriteRequestExecuted = true;
  isDeleteRequestExecuted = true;
  isDoneRequestExecuted = true;
  currentDate;

  ngOnInit(): void {
    this.refresh();

    this.interval = setInterval(() => {
      this.refresh();
    }, 60000);
    this.intervalOverdue = setInterval(() => {
      this.getOverdueTasks();
    }, 60000);
  }
  refresh() {
    this.getUserTasks();
    this.getCompletedTasks();
    this.getFavoriteTasks();
    this.getOverdueTasks();
  }
  getUserTasks() {
    this.taskService.getUserTasks().subscribe(
      data => {
        this.allTasks = data;
        this.changeDetection.detectChanges();
        this.changeDetection.checkNoChanges();
      },
      err => {
        console.log("oops", err);
      });
  }
  getOverdueTasks() {
    this.taskService.getOverdueTasks().subscribe(
      data => {
        this.overdueTasks = data;
        this.changeDetection.detectChanges();
        this.changeDetection.checkNoChanges();
      },
      err => {
        console.log("oops", err);
      });

  }

  getCompletedTasks() {
    this.taskService.getCompletedTasks().subscribe(
      data => {
        this.completedTasks = data;
        this.changeDetection.detectChanges();
        this.changeDetection.checkNoChanges();
      },
      err => {
        console.log("oops", err);
      });
  }

  getFavoriteTasks() {
    this.taskService.getFavoriteTasks().subscribe(
      data => {
        this.favoriteTasks = data;
        this.changeDetection.detectChanges();
      },
      err => {
        console.log("oops", err);
      });
  }
  goToAddPage() {
    this.router.navigate(['/tasks/add']);
  }
  goToEditPage(task_id: number) {
    this.router.navigate(['/tasks/edit', task_id]);
  }
  moveToFavorite(isFavoriteValue: boolean, task: any, tab) {
    let index;
    switch (tab) {
      case "all": {
        index = this.allTasks.indexOf(task);
        this.allTasks[index].isFavorite = !isFavoriteValue;
        break;
      }
      case "overdue": {
        index = this.overdueTasks.indexOf(task);
        this.overdueTasks[index].isFavorite = !isFavoriteValue;
        break;
      }
      case "completed": {
        index = this.completedTasks.indexOf(task);
        this.completedTasks[index].isFavorite = !isFavoriteValue;
        break;
      }
      case "favorite": {
        index = this.favoriteTasks.indexOf(task);
        this.favoriteTasks[index].isFavorite = !isFavoriteValue;
        break;
      }
    }
    this.isFavoriteRequestExecuted = false;
    this.taskService.updateTask(task).subscribe(
      data => {
        console.log(data);
        this.refresh();
        this.isFavoriteRequestExecuted = true;
        this.openSnackBar("Selected task has been updated", "Confirm")
      },
      err => {
        console.log("oops", err);
      });
  }
  completeTask(task) {
    let index = this.allTasks.indexOf(task);
    let favindex = this.favoriteTasks.indexOf(task);
    if (index == -1) {
      index = favindex;
    }
    if (task.isOverdue == true) {
      this.openSnackBar("You cant mark overdue task like a completed", "Confirm");
      this.allTasks[index].isDone = false;
      return;
    }
    this.allTasks[index].IsDone = true;
    this.isDoneRequestExecuted = false;
    this.taskService.updateTask(task).subscribe(
      data => {
        this.isDoneRequestExecuted = true;
        this.refresh();
        this.openSnackBar("Selected task marked as done", "Confirm");
      },
      err => {
        console.log("oops", err);
      });
  }
  deleteTask(name: string, task_Id: number) {
    if (confirm("Are you sure to delete task with header -  " + name)) {
      this.isDeleteRequestExecuted = false;
      this.taskService.deleteTask(task_Id).subscribe(
        data => {
          this.isDeleteRequestExecuted = true;
          this.refresh();
          this.openSnackBar("Selected task has been deleted", "Confirm");
        },
        err => {
          console.log("oops", err);
        });
    }
  }
  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, { duration: 800 });
  }
  openEditPage(taskId){
    this._ngZone.run(()=>{
      this.router.navigate(['tasks/edit/', taskId]);
      });
  }
}
